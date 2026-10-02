import { icon } from './icons.mjs';

const escape = value => String(value ?? '').replace(/[&<>"']/g, char => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' }[char]));
const list = value => Array.isArray(value) ? value : [];
const statuses = { running:'Assessing', completed:'Completed', failed:'Failed', cancelled:'Cancelled', interrupted:'Interrupted' };
const verdicts = { supported:'Supported', 'not-supported':'Not supported', 'insufficient-evidence':'Insufficient evidence' };
const findings = { supported:'Supported', contradicted:'Contradicted', unknown:'Unresolved' };
const decisions = { pending:'Not reviewed', accepted:'Accept assessment', 'changes-requested':'Request changes' };
const own = (object, value, fallback) => Object.hasOwn(object, value) ? value : fallback;
const amount = value => typeof value === 'number' && Number.isFinite(value) && value >= 0 ? value : null;

function when(value) {
  if (!value) return 'Date unavailable';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? 'Date unavailable' : new Intl.DateTimeFormat('en-GB', { day:'numeric', month:'short', hour:'2-digit', minute:'2-digit' }).format(date);
}

function duration(run) {
  const ms = amount(run?.elapsedMs);
  if (ms === null) return 'Not reported';
  if (ms < 1000) return `${Math.round(ms)} ms`;
  if (ms < 60000) return `${(ms / 1000).toFixed(1)} s`;
  return `${Math.floor(ms / 60000)} min ${Math.round((ms % 60000) / 1000)} s`;
}

function usage(run) {
  if (run?.kind === 'example') return { tokens:'No model used', cost:'No model used', input:null, output:null };
  const data = run?.usage || {};
  const input = amount(data.inputTokens ?? data.input_tokens ?? data.prompt_tokens);
  const output = amount(data.outputTokens ?? data.output_tokens ?? data.completion_tokens);
  const total = amount(data.totalTokens ?? data.total_tokens) ?? (input !== null && output !== null ? input + output : null);
  const cost = amount(data.costUsd ?? data.cost_usd);
  return {
    tokens:total === null ? 'Not reported' : `${new Intl.NumberFormat('en-GB').format(total)} tokens`,
    cost:cost === null ? 'Not reported' : new Intl.NumberFormat('en-GB', { style:'currency', currency:'USD', minimumFractionDigits:4, maximumFractionDigits:6 }).format(cost),
    input, output
  };
}

function connection(state) {
  const backend = state.backend || {};
  if (backend.configured && backend.available !== false) return { connected:true, title:backend.model || 'Model configured', detail:backend.provider ? `${backend.provider} · model configured` : 'Model configured for new assessments.' };
  if (backend.available === false) return { connected:false, title:'Model unavailable', detail:'New model assessments are available through the local workspace server.' };
  return { connected:false, title:'No model configured', detail:'The worked example and your local evidence are available to explore.' };
}

function hasResult(state) { return state.run?.status === 'completed' && Boolean(state.run.assessment); }

function draftChanged(state) {
  if (typeof state.draftChanged === 'boolean') return state.draftChanged;
  if (!state.run || typeof state.run.question !== 'string') return false;
  const sources = rows => list(rows).map(({ id, name, text }) => [id, name, text]);
  return String(state.question ?? '') !== state.run.question || JSON.stringify(sources(state.sources)) !== JSON.stringify(sources(state.run.sources));
}

function renderDraftStatus(state) {
  return `<p class="as-draft-status" data-assessment-draft-status ${draftChanged(state) ? '' : 'hidden'}>${icon('refresh',15)}<span>The inputs have changed. The result below belongs to the saved run. Run a new assessment to use the current question and evidence.</span></p>`;
}

function renderSourceList(state, running) {
  const sources = list(state.sources);
  if (!sources.length) return `<div class="as-evidence-empty">${icon('library',23)}<p>Add the change note and supporting records, or open the worked example.</p></div>`;
  return `<ul class="as-source-list">${sources.map(source => `<li class="${state.evidenceScope !== 'run' && source.id === state.sourceId ? 'selected' : ''}"><button type="button" class="as-source-select" data-assessment-source="${escape(source.id)}" aria-pressed="${state.evidenceScope !== 'run' && source.id === state.sourceId}">${icon('document',17)}<span>${escape(source.name || 'Untitled source')}</span><small>${new Intl.NumberFormat('en-GB').format(String(source.text ?? '').length)} chars</small></button><button type="button" class="icon-button as-remove-source" data-assessment-remove="${escape(source.id)}" aria-label="Remove ${escape(source.name || 'source')}" ${running ? 'disabled' : ''}>${icon('close',13)}</button></li>`).join('')}</ul>`;
}

function quoteRange(body, quote) {
  if (!quote.trim()) return null;
  const exact = body.indexOf(quote);
  if (exact >= 0) return { start:exact, end:exact + quote.length };
  const words = quote.trim().split(/\s+/).map(word => word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));
  const match = new RegExp(words.join('\\s+'), 'u').exec(body);
  return match ? { start:match.index, end:match.index + match[0].length } : null;
}

function renderReader(state) {
  const snapshot = state.evidenceScope === 'run';
  const sources = list(snapshot ? state.run?.sources : state.sources);
  const selected = state.sourceId ? sources.find(source => source.id === state.sourceId) : sources[0];
  const quote = snapshot ? String(state.highlightQuote ?? '') : '';
  const body = String(selected?.text ?? '');
  const range = quoteRange(body,quote);
  const content = range ? `${escape(body.slice(0,range.start))}<mark id="assessment-quote">${escape(body.slice(range.start,range.end))}</mark>${escape(body.slice(range.end))}` : escape(body);
  return `<aside class="as-reader" id="assessment-source-view" aria-labelledby="assessment-source-title" tabindex="-1"><div class="as-reader-heading"><span class="eyebrow" id="assessment-source-title">EVIDENCE READER</span>${icon('document',18)}</div>
    ${selected ? `<div class="as-reader-meta"><span class="as-reader-scope">${snapshot ? 'SOURCE USED IN THIS RUN' : 'CURRENT EVIDENCE'}</span><h2>${escape(selected.name || 'Untitled source')}</h2><p>${snapshot ? 'Preserved with the assessment.' : 'Select a source or follow a citation to examine the record.'}</p></div>${quote.trim() && !range ? `<div class="as-quote-missing"><strong>Quote not found in this source.</strong><p>${escape(quote)}</p><small>Check the reference against the original record.</small></div>` : ''}<pre class="as-source-text">${content || '<span class="as-empty-document">This document is empty.</span>'}</pre>` : `<div class="as-reader-empty">${icon('document',38)}<h2>The record behind the finding.</h2><p>${snapshot ? 'The saved source is unavailable for this run.' : 'Your selected document will appear here. Citations open the exact source used in an assessment.'}</p></div>`}
  </aside>`;
}

function renderCitations(citations, sources) {
  if (!list(citations).length) return `<p class="as-no-citation">No source citation provided.</p>`;
  return `<div class="as-citations">${list(citations).map(citation => {
    const source = sources.find(item => item.id === citation.sourceId);
    return `<button type="button" class="as-citation" data-assessment-citation="${escape(citation.sourceId)}" data-assessment-quote="${escape(citation.quote)}"><span>${icon('link',13)}${escape(source?.name || citation.sourceId || 'Source unavailable')}${icon('arrowRight',12)}</span><q>${escape(citation.quote || 'Open the source')}</q></button>`;
  }).join('')}</div>`;
}

function renderReview(state) {
  const review = state.review || {};
  const decision = own(decisions, review.decision, 'pending');
  const enabled = hasResult(state);
  return `<section class="as-review" aria-labelledby="assessment-review-title"><div class="as-section-heading"><div><span class="eyebrow">YOUR REVIEW</span><h2 id="assessment-review-title">Does the assessment hold up?</h2></div>${icon('shield',23)}</div><p class="as-review-scope">This records your review of the assessment. It does not approve or carry out the proposed change.</p>
    <label class="as-field-label" for="assessment-decision">Review decision</label><select id="assessment-decision" ${enabled ? '' : 'disabled'}>${Object.entries(decisions).map(([key,label]) => `<option value="${key}" ${decision === key ? 'selected' : ''}>${label}</option>`).join('')}</select>
    <label class="as-field-label" for="assessment-review-note">Your note</label><textarea id="assessment-review-note" rows="4" maxlength="6000" placeholder="What do you agree with? What needs to be checked or changed?" ${enabled ? '' : 'disabled'}>${escape(review.note)}</textarea>
    <div class="as-review-actions"><button class="secondary-button" type="button" data-assessment-action="save-review" ${enabled ? '' : 'disabled'}>${icon('check',15)}Save review</button><span data-assessment-review-status>${state.reviewDirty ? 'Unsaved review' : decision === 'pending' && !review.note ? 'Not yet reviewed' : 'Review saved with this run'}</span></div>
  </section>`;
}

function renderResult(state) {
  const run = state.run;
  if (!run) return `<section class="as-result-empty"><span class="eyebrow">THE ASSESSMENT</span><h2>A finding should lead back to a record.</h2><p>The worked example shows a change assessment with source citations, missing checks and a place for your review.</p></section>`;
  const status = own(statuses, run.status, 'interrupted');
  const example = run.kind === 'example';
  const runError = String(run.error ?? '');
  const runLabel = example ? 'WORKED EXAMPLE' : 'MODEL ASSESSMENT';
  const top = `<div class="as-result-heading"><div><span class="eyebrow">${runLabel}</span><h2>${status === 'running' ? 'Examining the evidence.' : status === 'completed' ? 'The assessment.' : 'Assessment stopped.'}</h2></div><span class="as-run-status as-status-${status}">${status === 'running' ? icon('clock',13) : icon(status === 'completed' ? 'check' : 'pause',13)}${statuses[status]}</span></div>`;
  if (status !== 'completed') return `<section class="as-result" aria-labelledby="assessment-run-question">${top}<p class="as-run-question" id="assessment-run-question">${escape(run.question || state.question)}</p><p class="as-run-message" role="status">${status === 'running' ? 'The model request is in progress. You can cancel it below.' : status === 'cancelled' ? 'This request was cancelled. No completed assessment was saved.' : status === 'interrupted' ? 'The connection was interrupted. Reconnect to check this run before starting another.' : 'The request did not return a completed assessment.'}</p>${runError ? `<p class="as-error" role="alert">${escape(runError)}</p>` : ''}${status === 'running' ? `<button class="secondary-button" type="button" data-assessment-action="cancel">${icon('pause',14)}Cancel request</button>` : ''}</section>`;
  const assessment = run.assessment;
  if (!assessment) return `<section class="as-result">${top}<p class="as-error">This run has no assessment to display.</p></section>`;
  const verdict = own(verdicts, assessment.verdict, 'insufficient-evidence');
  const tokens = usage(run);
  return `<section class="as-result" aria-labelledby="assessment-result-title">${top}
    <div class="as-run-context"><span>${example ? 'No model used · reference assessment' : `${escape(run.model || 'Model not reported')}${run.provider ? ` · ${escape(run.provider)}` : ''}`}</span><span>${escape(when(run.startedAt))}</span></div>
    <p class="as-run-question" id="assessment-result-title">${escape(run.question || 'Saved assessment')}</p>
    <div class="as-verdict as-verdict-${verdict}"><span>${icon(verdict === 'supported' ? 'check' : verdict === 'not-supported' ? 'close' : 'search',17)}${verdicts[verdict]}</span><p>${escape(assessment.summary || 'No summary was returned.')}</p></div>
    <div class="as-findings">${list(assessment.findings).map((finding,index) => {
      const status = own(findings, finding.status, 'unknown');
      return `<article class="as-finding" data-finding-id="${escape(finding.id)}"><div class="as-finding-top"><span class="mono">${String(index + 1).padStart(2,'0')}</span><span class="as-finding-status as-finding-${status}">${icon(status === 'supported' ? 'check' : status === 'contradicted' ? 'close' : 'search',12)}${findings[status]}</span></div><h3>${escape(finding.title || 'Finding')}</h3><p>${escape(finding.detail)}</p>${renderCitations(finding.citations,list(run.sources))}</article>`;
    }).join('')}</div>
    <div class="as-checks"><section><h3>Missing checks</h3>${list(assessment.missingChecks).length ? `<ul>${list(assessment.missingChecks).map(check => `<li>${escape(check)}</li>`).join('')}</ul>` : '<p>No missing checks listed in this assessment.</p>'}</section><section><h3>Suggested next steps</h3>${list(assessment.nextSteps).length ? `<ol>${list(assessment.nextSteps).map(step => `<li>${escape(step)}</li>`).join('')}</ol>` : '<p>No next steps listed in this assessment.</p>'}</section></div>
    <div class="as-result-footer"><span>${example ? 'Worked example · no model used' : `${escape(duration(run))} · ${escape(tokens.tokens)} · Cost: ${escape(tokens.cost)}`}</span><button class="text-button" type="button" data-assessment-action="export">${icon('external',14)}Export assessment</button></div>
    ${renderReview(state)}
  </section>`;
}

function renderHistory(state) {
  const history = list(state.history);
  if (!history.length) return '';
  return `<section class="as-history" aria-labelledby="assessment-history-title"><div class="as-section-heading"><div><span class="eyebrow">SAVED IN THIS BROWSER</span><h2 id="assessment-history-title">Previous assessments.</h2></div><span class="as-history-count mono">${history.length}</span></div><div class="as-history-list">${history.map(run => `<button type="button" data-assessment-run="${escape(run.id)}" class="${state.run?.id === run.id ? 'selected' : ''}" aria-pressed="${state.run?.id === run.id}"><span>${icon(run.kind === 'example' ? 'document' : 'nereus',19)}<span><strong>${escape(run.question || 'Untitled assessment')}</strong><small>${run.kind === 'example' ? 'Worked example · no model used' : escape(run.model || 'Model assessment')}</small></span></span><span><small>${escape(when(run.startedAt))}</small><span>${statuses[own(statuses,run.status,'interrupted')]}</span></span>${icon('arrowRight',14)}</button>`).join('')}</div></section>`;
}

export function renderAssessment(state = {}) {
  const model = connection(state);
  const running = state.run?.status === 'running';
  const sources = list(state.sources);
  const canRun = model.connected && Boolean(String(state.question ?? '').trim()) && sources.some(source => String(source.text ?? '').trim()) && !running;
  const needs = !model.connected ? 'Connect a model to run new assessments.' : !String(state.question ?? '').trim() ? 'Add the question you want to assess.' : !sources.some(source => String(source.text ?? '').trim()) ? 'Add a source with evidence for the assessment.' : 'The current question and evidence will be sent to the configured model.';
  return `<section class="assessment-view" aria-label="Nereus change assessment"><header class="as-header"><div><p class="eyebrow">NEREUS / CHANGE ASSESSMENT</p><h1>What does the evidence support?</h1><p>Bring the proposed change and its supporting records. Examine each finding, follow the sources and record your judgement.</p></div><span class="as-header-symbol">${icon('nereus',57)}</span></header>
    <div class="as-work-area"><div class="as-main"><section class="as-compose" aria-labelledby="assessment-question-label"><div class="as-compose-top"><label class="as-field-label" id="assessment-question-label" for="assessment-question">The question</label><button class="text-button" type="button" data-assessment-action="new" ${running ? 'disabled' : ''}>${icon('plus',14)}New assessment</button></div><textarea id="assessment-question" rows="3" maxlength="2000" placeholder="Is there enough evidence to proceed with this change?" ${running ? 'disabled' : ''}>${escape(state.question)}</textarea>
      <div class="as-evidence-top"><h2>Supporting evidence <span>${sources.length}</span></h2><label class="as-upload" for="assessment-files">${icon('plus',14)}Add files<input id="assessment-files" type="file" accept=".txt,.md,.csv,.json,text/plain,text/markdown,text/csv,application/json" multiple ${running ? 'disabled' : ''}></label></div><p class="as-file-hint">Text, Markdown, CSV or JSON. You can inspect each file before running an assessment.</p>${renderSourceList(state,running)}
      <div class="as-run-actions"><button class="${model.connected ? 'secondary-button' : 'primary-button'}" type="button" data-assessment-action="load-example" ${running ? 'disabled' : ''}>${icon('document',15)}${state.run?.kind === 'example' ? 'Reload worked example' : 'Open worked example'}</button><button class="${model.connected ? 'primary-button' : 'secondary-button'}" type="button" data-assessment-action="run" ${canRun ? '' : 'disabled'} aria-describedby="assessment-run-help">${icon('play',14)}${running ? 'Assessing…' : 'Run assessment'}</button>${running ? `<button class="text-button" type="button" data-assessment-action="cancel">Cancel</button>` : ''}</div>
      <p class="as-run-help" id="assessment-run-help">${running ? 'The request uses the question and sources saved at its start.' : needs}</p><p class="as-example-note">The worked example is free to explore. It uses a reference assessment, with no model call.</p>
      ${state.error ? `<p class="as-error" role="alert">${escape(state.error)}</p>` : ''}${renderDraftStatus(state)}
    </section>${renderResult(state)}</div>${renderReader(state)}</div>
    <div class="as-storage-note">${icon(state.storageStatus === 'unavailable' ? 'external' : 'database',14)}<span>${state.storageStatus === 'unavailable' ? 'Browser storage is unavailable. Export an assessment to keep a copy.' : 'Saved locally in this browser. Clearing browser data removes saved work.'}</span></div>${renderHistory(state)}
  </section>`;
}

export function renderAssessmentInspector(state = {}) {
  const model = connection(state);
  const run = state.run;
  const example = run?.kind === 'example';
  const tokens = usage(run);
  const decision = own(decisions,state.review?.decision,'pending');
  return `<aside class="inspector as-inspector" aria-label="Assessment details"><div class="inspector-heading"><span class="mono">ASSESSMENT DETAILS</span><button type="button" class="icon-button" data-action="inspector" aria-label="Close inspector">${icon('close',14)}</button></div><div class="inspector-body"><div class="inspector-identity"><span class="inspector-symbol">${icon('nereus',34)}</span><p class="eyebrow">STABILITY / SAFE CHANGE</p><h2>Nereus</h2></div><p class="inspector-description">Read the evidence for a proposed change, identify what is supported and keep missing checks visible for review.</p>
    <section class="inspector-block"><p class="eyebrow">MODEL CONNECTION</p><div class="as-connection"><span class="as-connection-dot ${model.connected ? 'connected' : ''}"></span><strong>${escape(model.title)}</strong></div><p class="field-note">${escape(model.detail)}</p><button type="button" class="text-button" data-assessment-action="refresh-connection" ${run?.status === 'running' ? 'disabled' : ''}>${icon('refresh',13)}Check connection</button></section>
    ${run ? `<section class="inspector-block"><p class="eyebrow">${example ? 'WORKED EXAMPLE' : 'SELECTED RUN'}</p><dl class="as-run-details"><div><dt>Status</dt><dd>${statuses[own(statuses,run.status,'interrupted')]}</dd></div><div><dt>Started</dt><dd>${escape(when(run.startedAt))}</dd></div><div><dt>Model</dt><dd>${example ? 'No model used' : escape(run.model || 'Not reported')}</dd></div>${!example ? `<div><dt>Provider</dt><dd>${escape(run.provider || 'Not reported')}</dd></div><div><dt>Duration</dt><dd>${escape(duration(run))}</dd></div><div><dt>Usage</dt><dd>${escape(tokens.tokens)}${tokens.input !== null && tokens.output !== null ? `<small>${tokens.input.toLocaleString('en-GB')} in / ${tokens.output.toLocaleString('en-GB')} out</small>` : ''}</dd></div><div><dt>Cost</dt><dd>${escape(tokens.cost)}</dd></div>` : ''}<div><dt>Sources</dt><dd>${list(run.sources).length} saved with the run</dd></div><div><dt>Review</dt><dd>${decision === 'accepted' ? 'Assessment accepted' : decision === 'changes-requested' ? 'Changes requested' : 'Not reviewed'}${state.reviewDirty ? '<small>Unsaved changes</small>' : ''}</dd></div></dl></section>` : `<section class="inspector-block"><p class="eyebrow">START WITH AN EXAMPLE</p><p class="inspector-value">Open the worked example to inspect a complete assessment, follow its citations and save your own review.</p></section>`}
    <section class="inspector-block"><p class="eyebrow">LOCAL RECORD</p><p class="inspector-value">${state.storageStatus === 'unavailable' ? 'This browser cannot save the workspace. Use export to keep the evidence and your review.' : 'This browser keeps the 10 most recent runs, including their question, evidence and saved review. Clearing browser data removes them. Export a run to keep a separate copy.'}</p></section>
    <div class="inspector-note">${icon('shield',15)}<p>Nereus assesses the evidence.<br>The responsible person approves the change.</p></div>
  </div></aside>`;
}
