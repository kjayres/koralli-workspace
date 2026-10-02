import { createServer } from 'node:http';
import { readFile, realpath } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { resolve, extname, sep } from 'node:path';
import { createNereusService } from './nereus-service.mjs';

const root = fileURLToPath(new URL('.', import.meta.url));
const MAX_BODY_BYTES = 384 * 1024;
const types = { '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8', '.mjs': 'text/javascript; charset=utf-8', '.svg': 'image/svg+xml', '.webp': 'image/webp', '.woff2': 'font/woff2' };
const publicFiles = new Set(['index.html', 'app.mjs', 'icons.mjs', 'fleet.mjs', 'workflow.mjs', 'poseidon.mjs', 'team-view.mjs',
  'styles.css', 'workflow.css', 'poseidon.css', 'team-view.css', 'assessment-core.mjs', 'assessment-example.mjs',
  'assessment-view.mjs', 'assessment.css', 'assessment-store.mjs', 'assessment-client.mjs']);
const localAddresses = new Set(['127.0.0.1', '::1', '::ffff:127.0.0.1']);
const fail = (statusCode, message) => Object.assign(new Error(message), { statusCode });

function sendJSON(response, statusCode, body) {
  response.writeHead(statusCode, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store',
    'X-Content-Type-Options': 'nosniff' });
  response.end(JSON.stringify(body));
}

function checkRequest(request, port, isAPI) {
  if (!localAddresses.has(request.socket.remoteAddress)) throw fail(403, 'Local access only.');
  const host = request.headers.host;
  if (![`127.0.0.1:${port}`, `localhost:${port}`, `[::1]:${port}`].includes(host)) throw fail(403, 'Invalid request host.');
  // Public assets may be reached by following a link from another site.
  if (!isAPI) return;
  const origin = request.headers.origin;
  if (origin !== undefined && origin !== `http://${host}`) throw fail(403, 'Cross-origin requests are not allowed.');
  if (request.headers['sec-fetch-site'] === 'cross-site') throw fail(403, 'Cross-site requests are not allowed.');
  if (isAPI && ['POST', 'DELETE'].includes(request.method) && origin !== `http://${host}`) throw fail(403, 'A same-origin request is required.');
}

function readJSON(request) {
  if (request.headers['content-type']?.split(';')[0].trim().toLowerCase() !== 'application/json') throw fail(415, 'Use application/json.');
  if (Number(request.headers['content-length']) > MAX_BODY_BYTES) { request.resume(); throw fail(413, 'Assessment request is too large.'); }
  return new Promise((resolveBody, reject) => {
    const chunks = [];
    let size = 0;
    let settled = false;
    const rejectOnce = error => { if (!settled) { settled = true; reject(error); } };
    request.on('data', chunk => {
      if (settled) return;
      size += chunk.length;
      if (size > MAX_BODY_BYTES) { rejectOnce(fail(413, 'Assessment request is too large.')); return; }
      chunks.push(chunk);
    });
    request.on('end', () => {
      if (settled) return;
      try { const body = JSON.parse(Buffer.concat(chunks).toString('utf8')); settled = true; resolveBody(body); }
      catch { rejectOnce(fail(400, 'The request must contain valid JSON.')); }
    });
    request.on('aborted', () => rejectOnce(fail(400, 'The request was interrupted.')));
    request.on('error', () => rejectOnce(fail(400, 'The request could not be read.')));
  });
}

export function createWorkspaceServer({ service = createNereusService(), rootDir = root } = {}) {
  const server = createServer(async (request, response) => {
    try {
      const pathname = decodeURIComponent(new URL(request.url, 'http://localhost').pathname);
      const isAPI = pathname.startsWith('/api/');
      checkRequest(request, server.address().port, isAPI);
      if (isAPI) {
        if (pathname === '/api/nereus/status' && request.method === 'GET') return sendJSON(response, 200, service.status());
        if (pathname === '/api/nereus/runs' && request.method === 'POST') return sendJSON(response, 202, service.start(await readJSON(request)));
        const match = pathname.match(/^\/api\/nereus\/runs\/([a-f0-9-]{36})$/);
        if (match && request.method === 'GET') return sendJSON(response, 200, service.get(match[1]));
        if (match && request.method === 'DELETE') return sendJSON(response, 200, service.cancel(match[1]));
        return sendJSON(response, 404, { error: 'API route not found.' });
      }
      if (!['GET', 'HEAD'].includes(request.method)) throw fail(405, 'Method not allowed.');
      const relative = pathname === '/' ? 'index.html' : pathname.slice(1);
      if (relative.split('/').some(part => !part || part.startsWith('.')) ||
        !(publicFiles.has(relative) || /^assets\/[a-zA-Z0-9_./-]+$/.test(relative)) || !types[extname(relative)]) throw fail(404, 'Not found.');
      const directory = await realpath(rootDir);
      const path = await realpath(resolve(directory, relative));
      if (!path.startsWith(directory + sep) || path !== resolve(directory, relative)) throw fail(404, 'Not found.');
      const bytes = await readFile(path);
      response.writeHead(200, { 'Content-Type': types[extname(path)], 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' });
      response.end(request.method === 'HEAD' ? undefined : bytes);
    } catch (error) {
      if (response.headersSent) { response.end(); return; }
      const statusCode = error.statusCode || (['ENOENT', 'ENOTDIR', 'EISDIR'].includes(error.code) || error instanceof URIError ? 404 : 500);
      sendJSON(response, statusCode, { error: error.statusCode ? error.message : statusCode === 404 ? 'Not found.' : 'The request could not be completed.' });
    }
  });
  server.requestTimeout = 15000;
  server.headersTimeout = 10000;
  server.on('close', () => service.close());
  return server;
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const port = Number(process.env.PORT || 4180);
  createWorkspaceServer().listen(port, '127.0.0.1', () => console.log(`Koralli workspace: http://127.0.0.1:${port}`));
}
