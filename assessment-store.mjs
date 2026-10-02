import { validateInput, validateAssessment } from './assessment-core.mjs';

export const STORAGE_KEY = 'koralli-nereus-workbench-v1';
export const HISTORY_LIMIT = 10;
const statuses = ['running', 'completed', 'failed', 'cancelled', 'interrupted'];
const decisions = ['pending', 'accepted', 'changes-requested'];
const text = (value, limit = 4000) => typeof value === 'string' ? value.slice(0, limit) : '';

export function emptyWorkbench() {
  return { question: '', sources: [], sourceId: '', mode: 'example', run: null,
    review: { decision: 'pending', note: '' }, history: [] };
}

export function cleanReview(value = {}) {
  if (!value || typeof value !== 'object') value = {};
  return { decision: decisions.includes(value.decision) ? value.decision : 'pending',
    note: text(value.note, 6000), savedAt: text(value.savedAt, 40) };
}

function cleanRun(value) {
  if (!value || typeof value !== 'object' || !statuses.includes(value.status) ||
      !['example', 'model'].includes(value.kind) || !/^[\w-]{1,100}$/.test(value.id)) throw new Error('Invalid saved run.');
  const input = validateInput({ question: value.question, sources: value.sources });
  const run = { ...input, id: value.id, status: value.status, kind: value.kind,
    startedAt: text(value.startedAt, 40), finishedAt: text(value.finishedAt, 40),
    model: text(value.model, 150), provider: text(value.provider, 150),
    error: text(value.error, 500), review: cleanReview(value.review),
    elapsedMs: Number.isFinite(value.elapsedMs) && value.elapsedMs >= 0 ? value.elapsedMs : null,
    usage: value.usage && typeof value.usage === 'object' ? Object.fromEntries(
      ['inputTokens', 'outputTokens', 'totalTokens', 'costUsd'].filter(key =>
        Number.isFinite(value.usage[key]) && value.usage[key] >= 0).map(key => [key, value.usage[key]])) : null };
  if (value.status === 'completed') run.assessment = validateAssessment(value.assessment, input.sources);
  return run;
}

export function readWorkbench(storage) {
  const empty = emptyWorkbench();
  try {
    const raw = storage?.getItem(STORAGE_KEY);
    if (!raw) return { ...empty, storageStatus: storage ? 'saved' : 'unavailable' };
    const saved = JSON.parse(raw);
    if (saved.version !== 1) throw new Error('Unknown saved format.');
    const history = (Array.isArray(saved.history) ? saved.history : []).slice(0, HISTORY_LIMIT)
      .flatMap(value => { try { return [cleanRun(value)]; } catch { return []; } });
    const run = history.find(item => item.id === saved.runId) || null;
    let sources = [];
    let draftError = '';
    try {
      if (saved.sources?.length) sources = validateInput({ question: 'Restore draft evidence', sources: saved.sources }).sources;
    } catch { draftError = 'Some draft evidence could not be restored. Saved assessments are still available.'; }
    return { question: text(saved.question, 2000), sources,
      sourceId: sources.some(source => source.id === saved.sourceId) ? saved.sourceId : sources[0]?.id || '',
      mode: run?.kind || 'example', run, review: cleanReview(run?.review), history, storageStatus: 'saved', error: draftError };
  } catch {
    return { ...empty, storageStatus: 'unavailable' };
  }
}

export function writeWorkbench(storage, state) {
  try {
    if (!storage) return false;
    storage.setItem(STORAGE_KEY, JSON.stringify({ version: 1, question: state.question,
      sources: state.sources, sourceId: state.sourceId, runId: state.run?.id || null,
      history: state.history.slice(0, HISTORY_LIMIT) }));
    return true;
  } catch { return false; }
}

export function retainRun(history, run) {
  return [run, ...history.filter(item => item.id !== run.id)].slice(0, HISTORY_LIMIT);
}

export function assessmentExport(run) {
  return JSON.stringify({ format: 'koralli-nereus-assessment', version: 1,
    exportedAt: new Date().toISOString(), kind: run.kind,
    provenance: run.kind === 'example' ? 'Authored worked example. No model was called.' :
      'Model-produced draft. Citation validation does not establish factual correctness.',
    run: cleanRun(run) }, null, 2);
}
