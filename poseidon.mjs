import { icon } from './icons.mjs';

const tasks = {
  research: { label: 'Research a question', role: 'Research', icon: 'fish', purpose: 'Read, connect and source', profile: 'Long-context model' },
  analysis: { label: 'Analyse the evidence', role: 'Analysis', icon: 'squid', purpose: 'Compare, reason and test', profile: 'Reasoning model' },
  review: { label: 'Review a draft', role: 'Review', icon: 'turtle', purpose: 'Check claims and omissions', profile: 'Reasoning model' }
};
const priorities = { balanced: 'Balanced', speed: 'Speed', depth: 'Depth' };
const budgets = { small: 'Small allowance', standard: 'Standard allowance', extended: 'Extended allowance' };
const valid = (value, choices, fallback) => Object.hasOwn(choices, value) ? value : fallback;

// Illustrative routing rules for the design preview. No model is called or trained.
export function getRoutePlan(state = {}) {
  const task = valid(state.task, tasks, 'research');
  const priority = valid(state.priority, priorities, 'balanced');
  const budget = valid(state.budget, budgets, 'standard');
  const specialist = tasks[task];
  let profile = specialist.profile;
  let allocation = 'One focused pass';
  let reason = task === 'research'
    ? 'A long-context profile is proposed for reading across the selected material and keeping sources attached.'
    : 'A reasoning profile is proposed for examining the evidence and making the checks explicit.';

  if (budget === 'small') {
    profile = 'Compact model';
    allocation = 'One bounded pass';
    reason = priority === 'depth'
      ? 'Depth is requested, but the small allowance takes precedence. The preview proposes a compact model and a bounded first pass; a fuller review would need more allowance.'
      : 'The small allowance takes precedence. The preview proposes a compact model for a bounded first pass and leaves unresolved questions visible.';
  } else if (priority === 'speed') {
    profile = 'Compact model';
    allocation = 'One direct pass';
    reason = 'Speed is the priority, so the preview proposes a compact model and one direct pass. A larger allowance does not need to be fully used.';
  } else if (priority === 'depth') {
    profile = task === 'research' ? 'Long-context reasoning model' : 'Reasoning model';
    allocation = budget === 'extended' ? 'Main pass + separate checking pass' : 'One focused reasoning pass';
    reason = budget === 'extended'
      ? 'Depth and an extended allowance permit a separate checking pass in this example. The specialist still keeps evidence and open questions with the result.'
      : 'Depth favours a reasoning profile. The standard allowance keeps this to one focused pass rather than an open-ended investigation.';
  } else if (budget === 'extended') {
    allocation = 'Main pass + checks where needed';
    reason += ' Extra allowance is reserved for checking gaps, rather than automatically spending more.';
  }
  return { task, priority, budget, role: specialist.role, icon: specialist.icon, profile,
    recommendationLabel: `${specialist.role} specialist`, budgetLabel: budgets[budget], allocation, reason };
}

export function renderPoseidon(state = {}) {
  const plan = getRoutePlan(state);
  return `<section class="poseidon-view" aria-label="Poseidon routing preview">
    <header class="ps-header"><div><p class="eyebrow">ORCHESTRATION / DESIGN PREVIEW</p><h1>Poseidon<span>Give the work a direction.</span></h1><p>Match a task to a specialist, a model profile and a compute allowance.</p></div><span class="ps-emblem">${icon('poseidon',66)}</span></header>
    <div class="ps-controls">
      <label class="ps-field" for="route-task"><span class="eyebrow">TASK</span><select id="route-task" data-route-field="task">${Object.entries(tasks).map(([key,task])=>`<option value="${key}" ${plan.task===key?'selected':''}>${task.label}</option>`).join('')}</select></label>
      <fieldset class="ps-priorities"><legend class="eyebrow">PRIORITY</legend><div>${Object.entries(priorities).map(([key,label])=>`<button type="button" data-route-priority="${key}" aria-pressed="${plan.priority===key}">${label}</button>`).join('')}</div></fieldset>
      <label class="ps-field" for="route-budget"><span class="eyebrow">COMPUTE</span><select id="route-budget" data-route-field="budget">${Object.entries(budgets).map(([key,label])=>`<option value="${key}" ${plan.budget===key?'selected':''}>${label}</option>`).join('')}</select></label>
    </div>
    <div class="ps-diagram-section"><div class="ps-map-caption"><span class="eyebrow">${state.previewed?'PROPOSED ROUTE':'ROUTE CONFIGURATION'}</span><span class="ps-static-note"><i></i>Illustrative rules</span></div>
      <div class="ps-route-map" aria-label="${tasks[plan.task].label} is routed through Poseidon to the ${plan.role.toLowerCase()} specialist">
        <div class="ps-source ps-box"><span class="ps-node-icon">${icon('document',25)}</span><p class="eyebrow">THE TASK</p><strong>${tasks[plan.task].label}</strong><small>Context + intended outcome</small></div>
        <div class="ps-hub ps-box"><span class="ps-node-icon">${icon('poseidon',42)}</span><p class="eyebrow">COORDINATOR</p><strong>Poseidon</strong><small>Role · model · allowance</small><span class="ps-hub-tag">${priorities[plan.priority]} / ${plan.budget}</span></div>
        <div class="ps-specialists ps-selected-${plan.task}">${Object.entries(tasks).map(([key,task])=>`<div class="ps-lane ${plan.task===key?'selected':''}" ${plan.task===key?'aria-current="true"':''}><span class="ps-species">${icon(task.icon,39)}</span><div><strong>${task.role}</strong><small>${task.purpose}</small></div><span class="ps-route-indicator" aria-label="${plan.task===key?'Selected route':'Available specialist'}">${plan.task===key?icon('check',13):''}</span></div>`).join('')}</div>
      </div>
      <div class="ps-route-summary" aria-live="polite"><div><span class="eyebrow">${state.previewed?'RECOMMENDATION':'PREVIEW SELECTION'}</span><p>${plan.recommendationLabel}<span> / </span>${plan.profile}</p><small>${plan.allocation}</small></div><button class="primary-button" type="button" data-action="route-preview">${icon('branch',16)}${state.previewed?'Preview again':'Preview route'}</button></div>
      ${state.previewed?`<p class="ps-route-reason"><span class="eyebrow">WHY THIS ROUTE</span>${plan.reason}</p>`:''}
    </div>
    <section class="ps-learning" aria-label="Planned routing feedback"><div class="ps-learning-heading"><h2>A route that can be evaluated.</h2><span class="ps-planned">Planned</span></div><p>A future implementation could use assessed outcomes to inform the next allocation.</p><ol class="ps-feedback">${[['document','Outcome'],['shield','Evaluation'],['database','Routing memory'],['branch','Next allocation']].map(([shape,label],i)=>`<li>${icon(shape,17)}<span>${label}</span>${i<3?icon('arrowRight',14):''}</li>`).join('')}</ol><p class="ps-learning-note">This preview uses fixed rules. It does not execute agents, measure quality or learn from these selections.</p></section>
  </section>`;
}

export function renderPoseidonInspector(state = {}) {
  const plan = getRoutePlan(state);
  return `<aside class="inspector" aria-label="Poseidon routing inspector"><div class="inspector-heading"><span class="mono">ROUTING DETAILS</span><button class="icon-button" data-action="inspector" aria-label="Close inspector">${icon('close',14)}</button></div>
    <div class="inspector-body"><div class="inspector-identity"><span class="inspector-symbol">${icon('poseidon',34)}</span><p class="eyebrow">${state.previewed?'PROPOSED ALLOCATION':'CONFIGURATION'}</p><h2>${state.previewed?plan.recommendationLabel:'Poseidon'}</h2></div>
      <p class="inspector-description">${state.previewed?'A proposed route for this example task.':'Choose the task, priority and allowance, then preview the proposed route.'}</p>
      <div class="inspector-block"><p class="eyebrow">MODEL PROFILE</p><p class="inspector-value">${plan.profile}</p><span class="field-note">A capability profile, not a connected model.</span></div>
      <div class="inspector-block"><p class="eyebrow">WHY THIS ROUTE</p><p class="inspector-value">${plan.reason}</p></div>
      <div class="inspector-block"><p class="eyebrow">COMPUTE ALLOWANCE</p><p class="inspector-value">${plan.budgetLabel}</p><span class="field-note">${plan.allocation}. These are design choices, not measured costs.</span></div>
      <div class="inspector-block"><p class="eyebrow">OPEN-MODEL DIRECTION</p><p class="inspector-value">Configure interchangeable open-weight models by capability. Evaluate them on the work before choosing profiles or considering specialist training.</p></div>
      <div class="inspector-note"><span class="hollow-dot"></span><p>Design preview only.<br>No execution, trained router or model connection.</p></div>
    </div></aside>`;
}
