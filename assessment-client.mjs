import { validateInput, validateAssessment } from './assessment-core.mjs';
import { exampleQuestion, exampleSources, exampleAssessment } from './assessment-example.mjs';
import { readWorkbench, writeWorkbench, retainRun, cleanReview, assessmentExport } from './assessment-store.mjs';

const clone = value => JSON.parse(JSON.stringify(value));
const running = run => run?.status === 'running';
const localHost = () => ['localhost', '127.0.0.1', '[::1]'].includes(location.hostname);

export function createAssessmentWorkspace({ onChange, notify }) {
  let storage;
  try { storage = localStorage; } catch {}
  const restored = readWorkbench(storage);
  const state = { ...restored, evidenceScope: 'draft', highlightQuote: '',
    backend: { available: false, configured: false, message: 'Connect a model locally to run new assessments.' },
    draftChanged: false, reviewDirty: false, error: restored.error || '' };
  const draftDiffers = () => !!state.run && JSON.stringify({ question: state.question, sources: state.sources }) !==
    JSON.stringify({ question: state.run.question, sources: state.run.sources });
  state.draftChanged = draftDiffers();
  let saveTimer;
  let pollTimer;
  let draftGeneration = 0;

  function changed() {
    state.draftChanged = draftDiffers();
    onChange();
  }
  function save() { clearTimeout(saveTimer); state.storageStatus = writeWorkbench(storage, state) ? 'saved' : 'unavailable'; }
  function remember(run) { state.run = run; state.history = retainRun(state.history, run); save(); }
  function error(message) { state.error = message; changed(); }
  async function request(path, options = {}) {
    const response = await fetch(`./api/nereus/${path}`, { ...options, headers: { 'Content-Type': 'application/json', ...options.headers } });
    let body;
    try { body = await response.json(); } catch { throw new Error('The local assessment service is unavailable.'); }
    if (!response.ok) { const failure = new Error(body.error || body.message || 'The assessment service could not complete this request.'); failure.status = response.status; throw failure; }
    return body;
  }
  async function connect() {
    if (!localHost()) { changed(); return; }
    try { state.backend = await request('status'); }
    catch { state.backend = { available: false, configured: false, message: 'Start the local assessment service to connect a model.' }; }
    changed();
    if (state.run?.kind === 'model' && ['running', 'interrupted'].includes(state.run.status)) poll(state.run.id);
  }
  function updateFromServer(result, id) {
    if (state.run?.id !== id) return;
    const current = state.run;
    const assessment = result.status === 'completed' ? validateAssessment(result.assessment, current.sources) : undefined;
    if (!['running', 'completed', 'failed', 'cancelled'].includes(result.status)) throw new Error('The service returned an invalid run status.');
    remember({ ...current, status: result.status, finishedAt: result.finishedAt || '', model: result.model || current.model,
      provider: result.provider || current.provider, usage: result.usage || null, elapsedMs: result.elapsedMs ?? null,
      error: result.error || '', ...(assessment ? { assessment } : {}) });
    changed();
  }
  async function poll(id) {
    clearTimeout(pollTimer);
    if (state.run?.id !== id || !['running', 'interrupted'].includes(state.run.status)) return;
    try { updateFromServer(await request(`runs/${encodeURIComponent(id)}`), id); }
    catch (failure) {
      if (state.run?.id !== id) return;
      remember({ ...state.run, status: 'interrupted', error: failure.status === 404 ?
        'The service no longer has this run. Its inputs are saved; reconnect and start a new assessment.' :
        'Connection lost or result could not be validated. The inputs are saved. Reconnect to check the run.' });
      changed(); return;
    }
    if (state.run?.id === id && running(state.run)) pollTimer = setTimeout(() => poll(id), 1200);
  }
  function loadExample() {
    if (running(state.run)) return;
    draftGeneration++;
    state.question = exampleQuestion; state.sources = clone(exampleSources); state.sourceId = state.sources[0].id;
    state.highlightQuote = ''; state.evidenceScope = 'draft'; state.error = ''; state.mode = 'example';
    state.review = cleanReview(); state.reviewDirty = false;
    const now = new Date().toISOString();
    remember({ id: `example-${crypto.randomUUID()}`, kind: 'example', status: 'completed',
      question: state.question, sources: clone(state.sources), startedAt: now, finishedAt: now,
      model: 'Authored worked example', provider: '', elapsedMs: null, usage: null,
      assessment: validateAssessment(clone(exampleAssessment), state.sources), review: cleanReview() });
    changed(); notify('Worked example loaded. No model was called.');
  }
  async function startRun() {
    if (running(state.run) || !state.backend.configured || !localHost()) return;
    let input;
    try { input = validateInput({ question: state.question, sources: state.sources }); }
    catch (failure) { error(failure.message); return; }
    draftGeneration++;
    state.error = ''; state.mode = 'model'; state.review = cleanReview(); state.reviewDirty = false;
    const pending = { id: `pending-${crypto.randomUUID()}`, kind: 'model', status: 'running',
      ...clone(input), startedAt: new Date().toISOString(), model: state.backend.model || '',
      provider: state.backend.provider || '', review: cleanReview() };
    remember(pending); changed();
    try {
      const result = await request('runs', { method: 'POST', body: JSON.stringify(input) });
      if (!result.id || result.status !== 'running') throw new Error('The service did not accept this run.');
      state.history = state.history.filter(run => run.id !== pending.id);
      remember({ ...pending, id: result.id }); changed(); poll(result.id);
    } catch (failure) { remember({ ...pending, status: 'failed', error: failure.message }); changed(); }
  }
  async function cancelRun() {
    if (!running(state.run) || state.run.id.startsWith('pending-')) return;
    const id = state.run.id;
    try { updateFromServer(await request(`runs/${encodeURIComponent(id)}`, { method: 'DELETE' }), id); }
    catch (failure) { error(`Cancellation could not be confirmed. ${failure.message}`); }
  }
  function saveReview() {
    if (!state.run?.assessment) return;
    const review = { ...cleanReview(state.review), savedAt: new Date().toISOString() };
    state.review = review; state.reviewDirty = false;
    remember({ ...state.run, review }); changed();
    notify(state.storageStatus === 'saved' ? 'Review saved in this browser.' : 'Browser storage is unavailable. Export the assessment to keep it.');
  }
  function openRun(id) {
    if (running(state.run)) return;
    const run = state.history.find(item => item.id === id); if (!run) return;
    draftGeneration++;
    state.run = run; state.question = run.question; state.sources = clone(run.sources); state.mode = run.kind;
    state.review = cleanReview(run.review); state.reviewDirty = false; state.sourceId = state.sources[0]?.id || '';
    state.evidenceScope = 'draft'; state.highlightQuote = ''; state.error = ''; save(); changed();
  }
  function exportRun() {
    if (!state.run) return;
    const url = URL.createObjectURL(new Blob([assessmentExport(state.run)], { type: 'application/json' }));
    const link = document.createElement('a'); link.href = url; link.download = `nereus-${state.run.id}.json`; link.click();
    setTimeout(() => URL.revokeObjectURL(url), 500);
    notify('Assessment, evidence and saved review exported.');
  }
  function newDraft() {
    if (running(state.run)) return;
    draftGeneration++;
    Object.assign(state, { question: '', sources: [], sourceId: '', run: null, review: cleanReview(),
      reviewDirty: false, highlightQuote: '', evidenceScope: 'draft', error: '', mode: 'model' });
    save(); changed();
  }
  function handleClick(target) {
    const element = target.closest('[data-assessment-action],[data-assessment-source],[data-assessment-remove],[data-assessment-citation],[data-assessment-run]');
    if (!element) return false;
    const data = element.dataset;
    if (data.assessmentAction) {
      const actions = { 'load-example': loadExample, run: startRun, cancel: cancelRun, export: exportRun,
        new: newDraft, 'save-review': saveReview, 'refresh-connection': connect };
      actions[data.assessmentAction]?.();
    } else if (data.assessmentCitation) {
      state.evidenceScope = 'run'; state.sourceId = data.assessmentCitation; state.highlightQuote = data.assessmentQuote || ''; changed();
      document.querySelector('#assessment-quote, #assessment-source-view')?.scrollIntoView({ block: 'nearest' });
    } else if (data.assessmentSource) {
      state.evidenceScope = 'draft'; state.sourceId = data.assessmentSource; state.highlightQuote = ''; changed();
    } else if (data.assessmentRemove) {
      if (running(state.run)) return true;
      draftGeneration++;
      state.sources = state.sources.filter(source => source.id !== data.assessmentRemove);
      if (!state.sources.some(source => source.id === state.sourceId)) state.sourceId = state.sources[0]?.id || '';
      state.evidenceScope = 'draft'; state.highlightQuote = ''; save(); changed();
    } else if (data.assessmentRun) openRun(data.assessmentRun);
    return true;
  }
  function handleInput(target) {
    if (target.id === 'assessment-question' && !running(state.run)) {
      state.question = target.value;
      state.draftChanged = draftDiffers();
      const notice = document.querySelector('[data-assessment-draft-status]');
      if (notice) { notice.hidden = !state.draftChanged; notice.textContent = 'Draft changed. The assessment and its citations still refer to the saved evidence.'; }
      const runButton = document.querySelector('[data-assessment-action="run"]');
      if (runButton) runButton.disabled = !state.backend.configured || !state.sources.length || !state.question.trim();
      clearTimeout(saveTimer); saveTimer = setTimeout(save, 350); return true;
    }
    if (target.id === 'assessment-review-note') {
      state.review.note = target.value; state.reviewDirty = true;
      const notice = document.querySelector('[data-assessment-review-status]');
      if (notice) notice.textContent = 'Unsaved review changes';
      return true;
    }
    return false;
  }
  async function handleChange(target) {
    if (target.id === 'assessment-decision') { state.review.decision = target.value; state.reviewDirty = true; changed(); return; }
    if (['assessment-question', 'assessment-review-note'].includes(target.id)) { save(); return; }
    if (target.id !== 'assessment-files' || running(state.run)) return;
    const generation = ++draftGeneration;
    const originalSources = clone(state.sources);
    try {
      const files = [...target.files];
      target.value = '';
      if (originalSources.length + files.length > 8) throw new Error('Keep each assessment to eight evidence files or fewer.');
      let index = Math.max(0, ...originalSources.map(source => Number(source.id.split('-')[1]) || 0));
      const additions = [];
      for (const file of files) {
        if (!/\.(txt|md|csv|json)$/i.test(file.name)) throw new Error('Use plain-text, Markdown, CSV or JSON evidence files.');
        if (file.size > 120000) throw new Error('Each evidence file must be smaller than 120 KB.');
        additions.push({ id: `source-${++index}`, name: file.name, text: await file.text() });
        if (generation !== draftGeneration) return;
      }
      const input = validateInput({ question: state.question.trim() || 'Untitled assessment', sources: [...originalSources, ...additions] });
      state.sources = input.sources; state.sourceId = additions[0]?.id || state.sourceId;
      state.evidenceScope = 'draft'; state.highlightQuote = ''; state.error = ''; save(); changed();
    } catch (failure) { if (generation === draftGeneration) error(failure.message); }
  }
  addEventListener('pagehide', save);
  if (running(state.run) && !localHost()) {
    remember({ ...state.run, status: 'interrupted', error: 'Reconnect to the local service to inspect this run.' });
  }
  return { state, connect, handleClick, handleInput, handleChange };
}
