import test from 'node:test';
import assert from 'node:assert/strict';
import { once } from 'node:events';
import { request as httpRequest } from 'node:http';
import { setTimeout as delay } from 'node:timers/promises';
import { createNereusService } from '../nereus-service.mjs';
import { createWorkspaceServer } from '../server.mjs';

const input = { question: 'Does the supplied record support the proposed timeout setting?',
  sources: [{ id: 'source-1', name: 'Approved change note', text: 'The proposed timeout is 30 seconds. No production change has been made.' }] };
const assessment = { verdict: 'supported', summary: 'The note records the proposed timeout, without establishing execution.',
  findings: [{ id: 'finding-1', title: 'Proposed setting', status: 'supported', detail: 'The supplied note proposes a 30 second timeout.',
    citations: [{ sourceId: 'source-1', quote: 'The proposed timeout is 30 seconds.' }] }],
  missingChecks: ['Execution has not been verified.'], nextSteps: ['Review the proposed setting before making any change.'] };
const configured = { NEREUS_MODEL: 'example-model', NEREUS_API_KEY: 'test-private-key' };
const completion = (value = assessment, extra = {}) => new Response(JSON.stringify({
  choices: [{ finish_reason: 'stop', message: { content: JSON.stringify(value) } }],
  usage: { prompt_tokens: 81, completion_tokens: 46 }, ...extra
}), { headers: { 'Content-Type': 'application/json' } });
const serviceFor = (t, options = {}) => {
  const service = createNereusService({ env: configured, fetchImpl: async () => completion(), ...options });
  t.after(() => service.close());
  return service;
};
async function settled(service, id) {
  for (let i = 0; i < 100; i++) {
    const run = service.get(id);
    if (run.status !== 'running') return run;
    await delay(5);
  }
  throw new Error('Mock assessment did not settle');
}
async function serverFor(t, service) {
  const server = createWorkspaceServer({ service });
  server.listen(0, '127.0.0.1');
  await once(server, 'listening');
  t.after(async () => {
    service.close();
    server.closeAllConnections();
    await new Promise(resolve => server.close(resolve));
  });
  return `http://127.0.0.1:${server.address().port}`;
}
function requestWithHost(url, host) {
  return new Promise((resolve, reject) => {
    // fetch normalises Host in this runtime; send the hostile header on the wire.
    const request = httpRequest(url, { headers: { Host: host } }, response => {
      response.resume();
      response.once('end', () => resolve(response.statusCode));
    });
    request.once('error', reject);
    request.end();
  });
}

test('unconfigured status and polling make no model requests', t => {
  let calls = 0;
  const service = serviceFor(t, { env: {}, fetchImpl: () => { calls++; throw new Error(); } });
  assert.deepEqual(service.status(), { available: true, configured: false, model: null, provider: null,
    message: 'No model is configured. This workspace remains a design preview.' });
  assert.throws(() => service.start(input), error => error.statusCode === 503);
  assert.throws(() => service.get('missing'), error => error.statusCode === 404);
  assert.equal(calls, 0);
});

test('one explicit request uses the fixed server endpoint and returns validated evidence', async t => {
  let request;
  const service = serviceFor(t, { fetchImpl: async (url, options) => { request = { url, options }; return completion(); } });
  assert.equal(service.status().configured, true);
  assert.equal(request, undefined);
  const started = service.start({ ...input, endpoint: 'https://untrusted.example', model: 'browser-model' });
  const run = await settled(service, started.id);
  assert.equal(run.status, 'completed');
  assert.equal(request.url, 'http://127.0.0.1:11434/v1/chat/completions');
  assert.equal(request.options.redirect, 'error');
  assert.equal(request.options.headers.Authorization, 'Bearer test-private-key');
  const body = JSON.parse(request.options.body);
  assert.equal(body.model, 'example-model');
  assert.equal(body.stream, false);
  assert.equal(body.max_tokens, 3000);
  assert.equal(body.tools, undefined);
  assert.equal(body.messages[0].role, 'system');
  assert.deepEqual(JSON.parse(body.messages[1].content), input);
  assert.deepEqual(run.assessment, assessment);
  assert.deepEqual(run.usage, { inputTokens: 81, outputTokens: 46 });
  assert.ok(run.finishedAt && run.elapsedMs >= 0);
  assert.equal(JSON.stringify(run).includes('test-private-key'), false);
});

test('invalid input is rejected before a model call', t => {
  let calls = 0;
  const service = serviceFor(t, { fetchImpl: () => { calls++; return completion(); } });
  assert.throws(() => service.start({ question: '', sources: [] }), error => error.statusCode === 400);
  assert.equal(calls, 0);
});

test('fabricated or unknown citations never become accepted results', async t => {
  for (const citation of [{ sourceId: 'source-1', quote: 'All tests passed.' }, { sourceId: 'invented', quote: input.sources[0].text }]) {
    const invalid = structuredClone(assessment);
    invalid.findings[0].citations = [citation];
    const service = serviceFor(t, { fetchImpl: async () => completion(invalid) });
    const run = await settled(service, service.start(input).id);
    assert.equal(run.status, 'failed');
    assert.equal(run.assessment, null);
    assert.match(run.error, /failed validation/);
  }
});

test('only one run is admitted and cancellation cannot later be overwritten', async t => {
  let resolveFirst;
  let calls = 0;
  let signal;
  const service = serviceFor(t, { fetchImpl: (_url, options) => {
    calls++;
    signal = options.signal;
    return calls === 1 ? new Promise(resolve => { resolveFirst = resolve; }) : Promise.resolve(completion());
  } });
  const first = service.start(input);
  assert.throws(() => service.start(input), error => error.statusCode === 409);
  assert.equal(service.cancel(first.id).status, 'cancelled');
  assert.equal(signal.aborted, true);
  resolveFirst(completion());
  const second = service.start(input);
  assert.equal((await settled(service, second.id)).status, 'completed');
  await delay(5);
  assert.equal(service.get(first.id).status, 'cancelled');
  assert.equal(service.get(first.id).assessment, null);
  assert.equal(calls, 2);
});

test('timeout aborts a request and does not retry', async t => {
  let calls = 0;
  let signal;
  const service = serviceFor(t, { timeoutMs: 15, fetchImpl: (_url, options) => {
    calls++; signal = options.signal; return new Promise(() => {});
  } });
  const run = await settled(service, service.start(input).id);
  assert.equal(run.status, 'failed');
  assert.match(run.error, /timed out/);
  assert.equal(signal.aborted, true);
  assert.equal(calls, 1);
});

test('provider errors and malformed output reveal no secret or response body', async t => {
  for (const fake of [
    async () => { throw new Error('test-private-key https://private-endpoint.example'); },
    async () => new Response('test-private-key', { status: 401 }),
    async () => new Response('test-private-key'),
    async () => completion(assessment, { choices: [{ finish_reason: 'length', message: { content: JSON.stringify(assessment) } }] }),
    async () => completion(assessment, { choices: [{ message: { tool_calls: [{ name: 'run-command' }], content: '{}' } }] })
  ]) {
    const service = serviceFor(t, { fetchImpl: fake });
    const run = await settled(service, service.start(input).id);
    assert.equal(run.status, 'failed');
    assert.equal(run.assessment, null);
    assert.equal(JSON.stringify(run).includes('test-private-key'), false);
    assert.equal(JSON.stringify(run).includes('private-endpoint'), false);
  }
});

test('oversized model output is rejected with bounded response reading', async t => {
  const service = serviceFor(t, { fetchImpl: async () => new Response('x'.repeat(1024 * 1024 + 1)) });
  const run = await settled(service, service.start(input).id);
  assert.equal(run.status, 'failed');
  assert.match(run.error, /oversized/);
});

test('insecure remote endpoint and URL credentials are not accepted', t => {
  for (const base of ['http://remote.example/v1', 'https://user:test-private-key@example.com/v1', 'https://example.com/v1?key=test-private-key']) {
    const service = serviceFor(t, { env: { ...configured, NEREUS_BASE_URL: base } });
    assert.equal(service.status().configured, false);
    assert.equal(JSON.stringify(service.status()).includes('test-private-key'), false);
  }
});

test('loopback API enforces Host, Origin, JSON and size bounds without calling a model', async t => {
  let calls = 0;
  const service = serviceFor(t, { fetchImpl: async () => { calls++; return completion(); } });
  const base = await serverFor(t, service);
  assert.equal((await fetch(`${base}/api/nereus/status`)).status, 200);
  assert.equal(await requestWithHost(`${base}/api/nereus/status`, 'attacker.example'), 403);
  assert.equal((await fetch(`${base}/api/nereus/status`, { headers: { Origin: 'https://attacker.example' } })).status, 403);
  assert.equal((await fetch(`${base}/api/nereus/runs`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(input) })).status, 403);
  assert.equal((await fetch(`${base}/api/nereus/runs`, { method: 'POST', headers: { Origin: base, 'Content-Type': 'text/plain' }, body: '{}' })).status, 415);
  assert.equal((await fetch(`${base}/api/nereus/runs`, { method: 'POST', headers: { Origin: base, 'Content-Type': 'application/json' }, body: '{broken' })).status, 400);
  assert.equal((await fetch(`${base}/api/nereus/runs`, { method: 'POST', headers: { Origin: base, 'Content-Type': 'application/json' }, body: 'x'.repeat(384 * 1024 + 1) })).status, 413);
  assert.equal((await fetch(`${base}/api/nereus/status`, { headers: { 'Sec-Fetch-Site': 'cross-site' } })).status, 403);
  assert.equal(calls, 0);
});

test('API runs require an explicit same-origin start and cancellation', async t => {
  const service = serviceFor(t, { fetchImpl: async () => new Promise(() => {}) });
  const base = await serverFor(t, service);
  const response = await fetch(`${base}/api/nereus/runs`, { method: 'POST', headers: { Origin: base, 'Content-Type': 'application/json' }, body: JSON.stringify(input) });
  assert.equal(response.status, 202);
  const start = await response.json();
  const route = `${base}/api/nereus/runs/${start.id}`;
  assert.equal((await (await fetch(route)).json()).status, 'running');
  assert.equal((await fetch(route, { method: 'DELETE' })).status, 403);
  assert.equal((await (await fetch(route, { method: 'DELETE', headers: { Origin: base } })).json()).status, 'cancelled');
  assert.equal((await (await fetch(route)).json()).assessment, null);
});

test('static page remains available while server, tests and private paths are hidden', async t => {
  const service = serviceFor(t, { env: {} });
  const base = await serverFor(t, service);
  assert.equal((await fetch(base)).status, 200);
  assert.equal((await fetch(base, { headers: { Origin: 'https://example.com', 'Sec-Fetch-Site': 'cross-site' } })).status, 200);
  assert.equal((await fetch(`${base}/app.mjs`)).status, 200);
  for (const path of ['/server.mjs', '/nereus-service.mjs', '/tests/nereus-service.test.mjs', '/.env', '/.git/config', '/assets/../server.mjs', '/README.md']) {
    assert.equal((await fetch(base + path)).status, 404, path);
  }
});
