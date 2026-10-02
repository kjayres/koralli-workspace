import test from 'node:test';
import assert from 'node:assert/strict';
import { createAssessmentWorkspace } from '../assessment-client.mjs';
import { STORAGE_KEY } from '../assessment-store.mjs';
import { exampleQuestion, exampleSources, exampleAssessment } from '../assessment-example.mjs';

const response = (body, status = 200) => ({ ok: status < 400, status, json: async () => structuredClone(body) });
const settle = () => new Promise(resolve => setImmediate(resolve));
const deferred = () => { let resolve; const promise = new Promise(done => { resolve = done; }); return { promise, resolve }; };
const completed = id => response({ id, status: 'completed', assessment: exampleAssessment, model: 'test-model' });

function harness(t, { hostname = 'localhost', saved, serve = () => { throw new Error('Unexpected test request.'); } } = {}) {
  const calls = [];
  const timers = new Map();
  const stored = new Map(saved ? [[STORAGE_KEY, JSON.stringify(saved)]] : []);
  const elements = new Map();
  let timerId = 0;
  const replacements = {
    location: { hostname },
    localStorage: { getItem: key => stored.get(key) ?? null, setItem: (key, value) => stored.set(key, value) },
    document: { querySelector: selector => {
      if (!elements.has(selector)) elements.set(selector, { hidden: true, textContent: '', scrollIntoView() {} });
      return elements.get(selector);
    } },
    addEventListener() {},
    setTimeout: (callback, delay) => { const id = ++timerId; timers.set(id, { callback, delay }); return id; },
    clearTimeout: id => timers.delete(id),
    fetch: async (url, options = {}) => {
      const request = { url, method: options.method || 'GET', body: options.body ? JSON.parse(options.body) : undefined };
      calls.push(request);
      return serve(request);
    }
  };
  const originals = new Map(Object.keys(replacements).map(key => [key, Object.getOwnPropertyDescriptor(globalThis, key)]));
  for (const [key, value] of Object.entries(replacements)) Object.defineProperty(globalThis, key, { value, configurable: true, writable: true });
  t.after(() => {
    timers.clear();
    for (const [key, descriptor] of originals) {
      if (descriptor) Object.defineProperty(globalThis, key, descriptor);
      else delete globalThis[key];
    }
  });
  const workspace = createAssessmentWorkspace({ onChange() {}, notify() {} });
  const click = dataset => workspace.handleClick({ closest: () => ({ dataset }) });
  return { workspace, calls, timers, click, action: name => click({ assessmentAction: name }) };
}

test('connecting and loading the worked example never submit model work', async t => {
  const env = harness(t, { serve: request => {
    assert.equal(request.url, './api/nereus/status');
    return response({ available: true, configured: true, model: 'test-model' });
  } });
  await env.workspace.connect();
  env.action('load-example');
  await settle();
  assert.deepEqual(env.calls.map(call => call.method), ['GET']);
  assert.equal(env.workspace.state.run.kind, 'example');
  assert.deepEqual(env.workspace.state.run.assessment, exampleAssessment);
});

test('Run is a no-op while no model is configured', async t => {
  const env = harness(t);
  env.action('load-example');
  const originalId = env.workspace.state.run.id;
  env.action('run');
  await settle();
  assert.equal(env.calls.length, 0);
  assert.equal(env.workspace.state.run.id, originalId);
});

test('the hosted preview does not contact the local service or submit work', async t => {
  const env = harness(t, { hostname: 'example.test' });
  await env.workspace.connect();
  env.action('load-example');
  env.workspace.state.backend.configured = true;
  env.action('run');
  await settle();
  assert.equal(env.calls.length, 0);
  assert.equal(env.workspace.state.run.kind, 'example');
});

test('draft edits and removal cannot alter the evidence behind a saved citation', t => {
  const env = harness(t);
  env.action('load-example');
  const run = env.workspace.state.run;
  const snapshot = structuredClone(run.sources);
  assert.notEqual(env.workspace.state.sources, run.sources);
  assert.notEqual(env.workspace.state.sources[0], run.sources[0]);
  env.workspace.state.sources[0].text = 'Replacement draft text';
  env.workspace.handleInput({ id: 'assessment-question', value: 'A different draft question' });
  env.click({ assessmentRemove: 'source-2' });
  const citation = run.assessment.findings[0].citations[0];
  env.click({ assessmentCitation: citation.sourceId, assessmentQuote: citation.quote });
  assert.deepEqual(run.sources, snapshot);
  assert.equal(env.workspace.state.draftChanged, true);
  assert.equal(env.workspace.state.evidenceScope, 'run');
  assert.equal(env.workspace.state.sourceId, 'source-2');
  assert.equal(env.workspace.state.highlightQuote, citation.quote);
  assert(!env.workspace.state.sources.some(source => source.id === 'source-2'));
  assert(run.sources.find(source => source.id === citation.sourceId).text.includes(citation.quote));
});

test('reconnecting resumes an interrupted run without submitting it again', async t => {
  const run = { id: 'run-interrupted', kind: 'model', status: 'interrupted', question: exampleQuestion,
    sources: exampleSources, review: { decision: 'pending', note: '' } };
  const env = harness(t, {
    saved: { version: 1, question: exampleQuestion, sources: exampleSources, runId: run.id, history: [run] },
    serve: request => request.url.endsWith('/status')
      ? response({ available: true, configured: true, model: 'test-model' }) : completed(run.id)
  });
  await env.workspace.connect();
  await settle();
  assert.equal(env.workspace.state.run.status, 'completed');
  assert.deepEqual(env.calls.map(call => call.url), ['./api/nereus/status', './api/nereus/runs/run-interrupted']);
  assert(env.calls.every(call => call.method === 'GET'));
});

test('a late cancellation response cannot overwrite a newer run', async t => {
  const oldPoll = deferred();
  const cancellation = deferred();
  let submitted = 0;
  const env = harness(t, { serve: request => {
    if (request.url.endsWith('/status')) return response({ available: true, configured: true, model: 'test-model' });
    if (request.method === 'POST') return response({ id: ++submitted === 1 ? 'run-old' : 'run-new', status: 'running' });
    if (request.method === 'DELETE') return cancellation.promise;
    if (request.url.endsWith('/run-old')) return oldPoll.promise;
    return response({ id: 'run-new', status: 'running' });
  } });
  await env.workspace.connect();
  env.action('load-example');
  env.action('run');
  await settle();
  env.action('cancel');
  oldPoll.resolve(completed('run-old'));
  await settle();
  assert.equal(env.workspace.state.run.status, 'completed');
  env.action('run');
  await settle();
  cancellation.resolve(response({ id: 'run-old', status: 'cancelled' }));
  await settle();
  assert.equal(env.workspace.state.run.id, 'run-new');
  assert.equal(env.workspace.state.run.status, 'running');
  assert.equal(env.calls.find(call => call.method === 'DELETE').url, './api/nereus/runs/run-old');
});

test('a late poll cannot replace the current run or schedule polling for the old run', async t => {
  const oldPoll = deferred();
  let submitted = 0;
  const env = harness(t, { serve: request => {
    if (request.url.endsWith('/status')) return response({ available: true, configured: true, model: 'test-model' });
    if (request.method === 'POST') return response({ id: ++submitted === 1 ? 'run-old' : 'run-new', status: 'running' });
    if (request.method === 'DELETE') return response({ id: 'run-old', status: 'cancelled' });
    if (request.url.endsWith('/run-old')) return oldPoll.promise;
    return response({ id: 'run-new', status: 'running' });
  } });
  await env.workspace.connect();
  env.action('load-example');
  env.action('run');
  await settle();
  env.action('cancel');
  await settle();
  env.action('run');
  await settle();
  oldPoll.resolve(response({ id: 'run-old', status: 'running' }));
  await settle();
  assert.equal(env.workspace.state.run.id, 'run-new');
  const polls = [...env.timers.entries()].filter(([, timer]) => timer.delay === 1200);
  assert.equal(polls.length, 1);
  env.timers.delete(polls[0][0]);
  polls[0][1].callback();
  await settle();
  assert.equal(env.calls.at(-1).url, './api/nereus/runs/run-new');
});

test('pending file reads cannot populate a replacement draft, example or historical run', async t => {
  const env = harness(t);
  env.action('load-example');
  const firstRunId = env.workspace.state.run.id;
  for (const navigate of [() => env.action('new'), () => env.action('load-example'), () => env.click({ assessmentRun: firstRunId })]) {
    const fileRead = deferred();
    const target = { id: 'assessment-files', value: 'old-draft.txt', files: [{ name: 'old-draft.txt', size: 18, text: () => fileRead.promise }] };
    const upload = env.workspace.handleChange(target);
    navigate();
    const expectedSources = structuredClone(env.workspace.state.sources);
    const expectedRunId = env.workspace.state.run?.id;
    fileRead.resolve('Old draft evidence');
    await upload;
    assert.deepEqual(env.workspace.state.sources, expectedSources);
    assert.equal(env.workspace.state.run?.id, expectedRunId);
    assert.equal(target.value, '');
  }
  assert.equal(env.calls.length, 0);
});
