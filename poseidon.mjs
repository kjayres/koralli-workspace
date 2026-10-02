import { icon } from './icons.mjs';
import { coordinators, getCoordinator } from './fleet.mjs';

const tasks = {
  incident: { label: 'Review a service interruption', coordinatorIds: ['galene', 'nereus', 'triton'], reason: 'Galene checks availability and dependencies. Nereus assesses any proposed repair for stability and safe change. Triton prepares the update for approval.' },
  change: { label: 'Assess a proposed change', coordinatorIds: ['nereus', 'galene', 'triton'], reason: 'Nereus reviews the change and its expected effects. Galene checks the availability requirements. Triton prepares an explanation of the proposed change.' },
  simulation: { label: 'Explore an operating scenario', coordinatorIds: ['proteus', 'triton'], reason: 'Proteus explores the authorised scenario and keeps assumptions visible. Triton turns the findings into a briefing, clearly labelled as a simulation.' },
  briefing: { label: 'Prepare an approved briefing', coordinatorIds: ['triton'], reason: 'This example begins with supplied, approved notes. Triton adapts them for the audience and channel; no investigation or system change is requested.' }
};
const priorities = { balanced: 'Balanced', speed: 'Speed', depth: 'Depth' };
const budgets = { small: 'Small allowance', standard: 'Standard allowance', extended: 'Extended allowance' };
const valid = (value, choices, fallback) => Object.hasOwn(choices, value) ? value : fallback;
const escape = value => String(value).replace(/[&<>"']/g, character => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[character]);

// Fixed example allocations for the interface. These rules do not execute or train agents.
export function getRoutePlan(state = {}) {
  const task = valid(state.task, tasks, 'incident');
  const priority = valid(state.priority, priorities, 'balanced');
  const budget = valid(state.budget, budgets, 'standard');
  const coordinatorIds = [...tasks[task].coordinatorIds];
  let profile = task === 'briefing' ? 'Compact model profile' : 'Task-matched reasoning profiles';
  let allocation = 'A focused pass at each handover';
  let resourceReason = 'Model profiles follow each team’s responsibility.';
  if (budget === 'small') {
    profile = 'Compact first-pass profiles';
    allocation = 'A bounded first pass; further work flagged';
    resourceReason = priority === 'depth'
      ? 'The small allowance limits the requested depth. Keep the review steps, scope the first pass and flag work needing more allowance.'
      : 'The small allowance narrows the first pass. It does not remove a review step or authorise a system change.';
  } else if (priority === 'speed') {
    profile = task === 'briefing' ? 'Compact model profile' : 'Compact profiles + focused reasoning';
    allocation = 'Short passes, with review steps retained';
    resourceReason = 'Speed reduces the scope of each pass, while keeping the same responsibilities and handovers. Extra allowance need not be used.';
  } else if (priority === 'depth') {
    profile = 'Reasoning profiles with extended context';
    allocation = budget === 'extended' ? 'Main passes + additional checks within each remit' : 'Focused reasoning within the standard allowance';
    resourceReason = budget === 'extended'
      ? 'Depth and an extended allowance provide room for additional checks within each team’s remit.'
      : 'Depth favours reasoning profiles, bounded by the standard allowance.';
  } else if (budget === 'extended') {
    allocation = 'Focused passes, with allowance held for gaps';
    resourceReason = 'Extra allowance is held for unresolved questions rather than automatically spent.';
  }
  const recommendationLabel = coordinatorIds.map(id => getCoordinator(id).name).join(' → ');
  return { task, priority, budget, coordinatorIds, profile, allocation,
    reason: `${tasks[task].reason} ${resourceReason}`, label: tasks[task].label,
    recommendationLabel, budgetLabel: budgets[budget] };
}

function renderCoordinator(coordinator, plan, expanded) {
  const allocated = plan.coordinatorIds.includes(coordinator.id);
  const isExpanded = expanded.includes(coordinator.id);
  return `<article class="ps-coordinator ${allocated ? 'allocated' : ''}">
    <div class="ps-team-row">
      <button class="ps-team-open" data-coordinator="${coordinator.id}" aria-label="Open ${coordinator.name}: ${escape(coordinator.subtitle)}"><span class="ps-team-symbol">${icon(coordinator.icon, 28)}</span><span class="ps-team-name">${coordinator.name}</span>${icon('arrowRight', 13)}</button>
      <p class="ps-responsibility">${escape(coordinator.subtitle)}</p>
      <p class="ps-team-status"><i></i>${allocated ? 'Included' : 'Available'}</p>
      <button class="ps-team-toggle" data-team-toggle="${coordinator.id}" aria-expanded="${isExpanded}" aria-controls="ps-team-${coordinator.id}"><span>${coordinator.specialists.length} specialists</span>${icon('chevronDown', 13)}</button>
    </div>
    <div class="ps-workers" id="ps-team-${coordinator.id}" ${isExpanded ? '' : 'hidden'}><p class="eyebrow">${escape(coordinator.teamName)}</p><div class="ps-worker-list">${coordinator.specialists.map(specialist => `<button data-agent="${specialist.id}" class="ps-worker">${icon(specialist.icon, 19)}<span>${escape(specialist.name)}</span>${icon('chevron', 11)}</button>`).join('')}</div></div>
  </article>`;
}

export function renderPoseidon(state = {}) {
  const plan = getRoutePlan(state);
  const expanded = Array.isArray(state.expanded) ? state.expanded : [];
  return `<section class="poseidon-view" aria-label="Poseidon coordination dashboard">
    <header class="ps-header"><div><p class="eyebrow">THE COORDINATION LAYER</p><h1>Poseidon</h1><p>Assign the work, choose the resources and inspect each team.</p></div><span class="ps-emblem">${icon('poseidon', 52)}</span></header>
    <div class="ps-controls">
      <label class="ps-field" for="route-task"><span class="eyebrow">EXAMPLE TASK</span><select id="route-task" data-route-field="task">${Object.entries(tasks).map(([key, task]) => `<option value="${key}" ${plan.task === key ? 'selected' : ''}>${task.label}</option>`).join('')}</select></label>
      <fieldset class="ps-priorities"><legend class="eyebrow">PRIORITY</legend><div>${Object.entries(priorities).map(([key, label]) => `<button type="button" data-route-priority="${key}" aria-pressed="${plan.priority === key}">${label}</button>`).join('')}</div></fieldset>
      <label class="ps-field" for="route-budget"><span class="eyebrow">COMPUTE</span><select id="route-budget" data-route-field="budget">${Object.entries(budgets).map(([key, label]) => `<option value="${key}" ${plan.budget === key ? 'selected' : ''}>${label}</option>`).join('')}</select></label>
    </div>
    <div class="ps-diagram-section"><div class="ps-map-caption"><span class="eyebrow">${state.previewed ? 'PROPOSED ALLOCATION' : 'TEAM ALLOCATION'}</span><span class="ps-static-note"><i></i>Illustrative assignment · no agents running</span></div>
      <div class="ps-hierarchy" aria-label="Poseidon team allocation">
        <div class="ps-command"><span class="ps-command-symbol">${icon('poseidon', 25)}</span><div><h2>Poseidon</h2><p>Task assignment · model profiles · compute</p></div><span class="ps-command-count">${plan.coordinatorIds.length} of ${coordinators.length} teams included</span></div>
        <div class="ps-team-columns" aria-hidden="true"><span>Team</span><span>Responsibility</span><span>Assignment</span><span>Specialists</span></div>
        <div class="ps-teams">${coordinators.map(coordinator => renderCoordinator(coordinator, plan, expanded)).join('')}</div>
      </div>
      <div class="ps-route-summary"><div><p class="eyebrow">ALLOCATION PROFILE</p><p>${plan.profile}</p><small>${plan.allocation}</small></div><button class="primary-button" type="button" data-action="route-preview">${icon('branch', 16)}${state.previewed ? 'Preview again' : 'Preview handover'}</button></div>
      ${state.previewed ? `<section class="ps-handover" aria-label="Proposed handover" aria-live="polite"><p class="eyebrow">HANDOVER FOR THIS TASK</p><ol>${plan.coordinatorIds.map((id, index) => { const team = getCoordinator(id); return `<li><span class="ps-step-number">${String(index + 1).padStart(2, '0')}</span><button data-coordinator="${id}">${icon(team.icon, 19)}${team.name}</button>${index < plan.coordinatorIds.length - 1 ? icon('arrowRight', 15) : ''}</li>`; }).join('')}</ol><p class="ps-route-reason">${plan.reason}</p></section>` : ''}
    </div>
    <section class="ps-learning" aria-label="Planned learning from evaluated outcomes"><div class="ps-learning-heading"><h2>Learning from the work</h2><span class="ps-planned">Planned capability</span></div><ol>
      <li><span class="ps-learning-number">01</span><div><h3>Evaluate outcomes</h3><p>Assess result quality and incorporate human review.</p></div></li>
      <li><span class="ps-learning-number">02</span><div><h3>Compare the resources</h3><p>Compare model cost and latency for comparable work.</p></div></li>
      <li><span class="ps-learning-number">03</span><div><h3>Test revised allocations</h3><p>Test proposed allocations against a fixed route before adoption.</p></div></li>
    </ol></section>
    <footer class="ps-footnote">Poseidon assigns the work. Each team keeps its remit, permissions and review requirements.</footer>
  </section>`;
}

export function renderPoseidonInspector(state = {}) {
  const plan = getRoutePlan(state);
  return `<aside class="inspector" aria-label="Poseidon allocation inspector"><div class="inspector-heading"><span class="mono">ALLOCATION DETAILS</span><button class="icon-button" data-action="inspector" aria-label="Close inspector">${icon('close', 14)}</button></div>
    <div class="inspector-body"><div class="inspector-identity"><span class="inspector-symbol">${icon('poseidon', 34)}</span><p class="eyebrow">${state.previewed ? 'PROPOSED HANDOVER' : 'CONFIGURATION'}</p><h2>${plan.label}</h2></div>
      <p class="inspector-description">Poseidon assigns responsibilities and allowance. The teams carry out their own bounded roles.</p>
      <div class="inspector-block"><p class="eyebrow">TEAMS IN ORDER</p>${plan.coordinatorIds.map(id => { const team = getCoordinator(id); return `<div class="input-line">${icon(team.icon, 18)}<span>${team.name} · ${escape(team.subtitle)}</span></div>`; }).join('')}</div>
      <div class="inspector-block"><p class="eyebrow">WHY THIS ROUTE</p><p class="inspector-value">${plan.reason}</p></div>
      <div class="inspector-block"><p class="eyebrow">MODEL & COMPUTE</p><p class="inspector-value">${plan.profile}</p><span class="field-note">${plan.budgetLabel}. ${plan.allocation}.</span></div>
      <div class="inspector-block"><p class="eyebrow">AUTHORITY</p><p class="inspector-value">Assignment does not grant permission to change a system, publish a message or impersonate a person. Those decisions remain separately controlled.</p></div>
      <div class="inspector-note"><span class="hollow-dot"></span><p>Fixed example routing.<br>No models, live systems or execution connected.</p></div>
    </div></aside>`;
}
