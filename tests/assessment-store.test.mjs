import test from 'node:test';
import assert from 'node:assert/strict';
import { readWorkbench, writeWorkbench, retainRun, assessmentExport, STORAGE_KEY, HISTORY_LIMIT } from '../assessment-store.mjs';
import { exampleQuestion, exampleSources, exampleAssessment } from '../assessment-example.mjs';

const clone = value => structuredClone(value);
const storage = () => {
  const values = new Map();
  return { getItem: key => values.get(key) || null, setItem: (key, value) => values.set(key, value) };
};
const run = (id = 'example-test') => ({ id, kind: 'example', status: 'completed', question: exampleQuestion,
  sources: clone(exampleSources), assessment: clone(exampleAssessment), startedAt: '2026-10-02T10:00:00Z',
  finishedAt: '2026-10-02T10:00:00Z', model: 'Authored worked example', provider: '',
  review: { decision: 'accepted', note: 'The stated uncertainty is appropriate.', savedAt: '2026-10-02T10:05:00Z' } });
const state = () => {
  const result = run();
  return { question: exampleQuestion, sources: clone(exampleSources), sourceId: 'source-2', run: result, history: [result] };
};

test('saved evidence, assessment and human review survive reload independently of the draft', () => {
  const disk = storage();
  const work = state();
  work.sources[1].text = 'A later record, which was not used for this assessment.';
  assert.equal(writeWorkbench(disk, work), true);
  const restored = readWorkbench(disk);
  assert.equal(restored.sources[1].text, work.sources[1].text);
  assert.equal(restored.run.sources[1].text, exampleSources[1].text);
  assert.equal(restored.run.review.decision, 'accepted');
  assert.equal(restored.run.assessment.verdict, 'insufficient-evidence');
});

test('an empty or whitespace-only draft cannot discard saved history', () => {
  for (const question of ['', '   ']) {
    const disk = storage();
    const work = state(); work.question = question; work.sources = [];
    writeWorkbench(disk, work);
    const restored = readWorkbench(disk);
    assert.equal(restored.history.length, 1);
    assert.equal(restored.run.id, 'example-test');
    assert.equal(restored.question, question);
  }
});

test('corrupt draft evidence is isolated from a valid saved result', () => {
  const disk = storage(); const work = state();
  work.sources = [{ id: 'source-1', name: 'Broken file', text: '' }];
  writeWorkbench(disk, work);
  const restored = readWorkbench(disk);
  assert.equal(restored.history.length, 1);
  assert.equal(restored.sources.length, 0);
  assert.match(restored.error, /could not be restored/);
});

test('a saved result with altered citation evidence is rejected', () => {
  const disk = storage(); const work = state();
  work.run.sources[1].text = 'This record was replaced.';
  writeWorkbench(disk, work);
  assert.equal(readWorkbench(disk).history.length, 0);
});

test('blocked or full storage reports a failure without claiming a save', () => {
  const blocked = { getItem() { throw new Error('denied'); }, setItem() { throw new Error('quota'); } };
  assert.equal(readWorkbench(blocked).storageStatus, 'unavailable');
  assert.equal(writeWorkbench(blocked, state()), false);
  assert.equal(writeWorkbench(undefined, state()), false);
});

test('updating a run does not duplicate history and retention is bounded', () => {
  let history = [];
  for (let i = 0; i < HISTORY_LIMIT + 3; i++) history = retainRun(history, run(`example-${i}`));
  assert.equal(history.length, HISTORY_LIMIT);
  const updated = { ...history[0], review: { decision: 'changes-requested', note: 'Check this.' } };
  history = retainRun(history, updated);
  assert.equal(history.length, HISTORY_LIMIT);
  assert.equal(history[0].review.decision, 'changes-requested');
});

test('export identifies the worked example and includes its evidence and saved review', () => {
  const exported = JSON.parse(assessmentExport(run()));
  assert.equal(exported.kind, 'example');
  assert.match(exported.provenance, /No model was called/);
  assert.equal(exported.run.sources.length, 4);
  assert.equal(exported.run.review.decision, 'accepted');
  assert.equal(exported.run.assessment.findings.length, 4);
});

test('unknown storage versions fail safely', () => {
  const disk = storage(); disk.setItem(STORAGE_KEY, JSON.stringify({ version: 999, history: [run()] }));
  assert.equal(readWorkbench(disk).storageStatus, 'unavailable');
});
