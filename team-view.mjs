import { coordinators, coreAgents, allAgents, getCoordinator } from './fleet.mjs';
import { icon } from './icons.mjs';

const escape = value => String(value ?? '').replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char]));
const scenarios = { galene: 'incident', nereus: 'change', proteus: 'simulation', triton: 'briefing' };

function specialistRows(agents, selectedAgent, prefix = 'SPECIALIST') {
  return agents.map((agent, index) => `<button type="button" class="agent-row team-agent-row ${selectedAgent === agent.id ? 'selected' : ''}" data-agent="${escape(agent.id)}" aria-label="Inspect ${escape(agent.name)}" ${selectedAgent === agent.id ? 'aria-current="true"' : ''}>
    <span class="agent-drawing">${icon(agent.icon, 39)}</span>
    <span><span class="mono agent-index">${String(index + 1).padStart(2, '0')} / ${escape(prefix)}</span><strong>${escape(agent.name)}</strong><span class="row-description">${escape(agent.description)}</span><span class="team-agent-profile"><span>MODEL PROFILE</span>${escape(agent.profile || 'To configure')}</span></span>
    <span class="agent-row-tail">Inspect ${icon('arrowRight', 17)}</span>
  </button>`).join('');
}

export function renderCoordinator(id) {
  const coordinator = getCoordinator(id);
  if (!coordinator) return '';
  return `<section class="team-view" aria-labelledby="coordinator-title">
    <header class="team-header">
      <div class="team-topline"><button type="button" class="text-button team-back" data-tab="poseidon">${icon('arrowRight', 14)} Poseidon</button><span class="eyebrow">COORDINATOR / DESIGN PREVIEW</span></div>
      <div class="team-identity"><div><h1 id="coordinator-title">${escape(coordinator.name)}</h1><p class="team-subtitle">${escape(coordinator.subtitle)}</p><p class="team-description">${escape(coordinator.description)}</p></div><span class="team-emblem">${icon(coordinator.icon, 68)}</span></div>
      <div class="team-header-bottom"><div class="team-chips"><span>${coordinator.specialists.length} specialists</span><span>${escape(coordinator.subtitle)}</span></div><button type="button" class="primary-button" data-scenario="${scenarios[coordinator.id]}">${icon('branch', 15)} Preview assignment</button></div>
    </header>
    <section class="team-remit" aria-label="Coordination remit">
      <div class="team-remit-main"><p class="eyebrow">COORDINATION REMIT</p><p>${escape(coordinator.task)}</p></div>
      <dl class="team-remit-details"><div><dt class="eyebrow">OUTPUT</dt><dd>${escape(coordinator.output)}</dd></div><div><dt class="eyebrow">ACCESS</dt><dd>${escape(coordinator.access)}</dd></div></dl>
    </section>
    <section class="team-specialists" aria-labelledby="team-specialists-title"><div class="team-section-heading"><div><p class="eyebrow">SPECIALIST TEAM</p><h2 id="team-specialists-title">${escape(coordinator.teamName)}</h2></div><span class="mono">${String(coordinator.specialists.length).padStart(2, '0')} ROLES</span></div><p class="team-section-note">Select a specialist to inspect its access and edit its instructions.</p>${specialistRows(coordinator.specialists)}</section>
  </section>`;
}

export function renderCoordinatorInspector(id) {
  const coordinator = getCoordinator(id);
  if (!coordinator) return '';
  return `<aside class="inspector" aria-label="${escape(coordinator.name)} coordinator details"><div class="inspector-heading"><span class="mono">COORDINATOR DETAILS</span><button type="button" class="icon-button" data-action="inspector" aria-label="Close inspector">${icon('close', 14)}</button></div>
    <div class="inspector-body"><div class="inspector-identity"><span class="inspector-symbol">${icon(coordinator.icon, 35)}</span><p class="eyebrow">${escape(coordinator.subtitle)}</p><h2>${escape(coordinator.name)}</h2></div><p class="inspector-description">${escape(coordinator.description)}</p>
      <div class="inspector-block"><p class="eyebrow">RESPONSIBILITY</p><p class="inspector-value">${escape(coordinator.task)}</p></div>
      <div class="inspector-block"><p class="eyebrow">OUTPUT</p><p class="inspector-value">${escape(coordinator.output)}</p></div>
      <div class="inspector-block"><p class="eyebrow">ACCESS</p><p class="access-line">${icon('shield', 16)}<span>${escape(coordinator.access)}</span></p></div>
      <div class="inspector-block"><p class="eyebrow">DECISION BOUNDARY</p><p class="inspector-value">${escape(coordinator.boundary)}</p></div>
      <div class="inspector-block"><p class="eyebrow">${escape(coordinator.teamName)}</p><div class="team-inspector-members">${coordinator.specialists.map(agent => `<button type="button" data-agent="${escape(agent.id)}">${icon(agent.icon, 20)}<span>${escape(agent.name)}</span>${icon('arrowRight', 13)}</button>`).join('')}</div></div>
      <button type="button" class="inspector-link" data-tab="poseidon">Return to Poseidon ${icon('arrowRight', 15)}</button>
    </div></aside>`;
}

export function renderFleet(selectedAgent, filter = 'all') {
  const selectedFilter = ['all', 'poseidon', ...coordinators.map(coordinator => coordinator.id)].includes(filter) ? filter : 'all';
  const groups = [{ id: 'poseidon', name: 'Poseidon', icon: 'poseidon', subtitle: 'Research, analysis and review', teamName: 'Core specialists', specialists: coreAgents }, ...coordinators];
  const visibleGroups = groups.filter(group => selectedFilter === 'all' || group.id === selectedFilter);
  const count = selectedFilter === 'all' ? allAgents.length : visibleGroups.reduce((sum, group) => sum + group.specialists.length, 0);
  return `<section class="library-view fleet-view" aria-labelledby="fleet-title">
    <div class="view-heading"><p class="eyebrow">AGENT LIBRARY</p><h1 id="fleet-title">Specialists around the work.</h1><p>Browse the teams, inspect each role and shape its instructions for the task.</p></div>
    <div class="fleet-filters" role="group" aria-label="Filter agents by coordinator">${[{ id: 'all', name: 'All teams' }, ...groups].map(group => `<button type="button" data-fleet-filter="${escape(group.id)}" aria-pressed="${selectedFilter === group.id}">${escape(group.name)}</button>`).join('')}</div>
    <div class="fleet-count mono"><span>${String(count).padStart(2, '0')} SPECIALIST TEMPLATES</span><span>ROLE / MODEL PROFILE</span></div>
    ${visibleGroups.map(group => `<section class="fleet-group" aria-labelledby="fleet-${escape(group.id)}"><header class="fleet-group-heading"><span class="fleet-coordinator-icon">${icon(group.icon, 43)}</span><div><p class="eyebrow">${escape(group.subtitle)}</p><h2 id="fleet-${escape(group.id)}">${escape(group.name)}<span>${escape(group.teamName)}</span></h2></div><button type="button" class="text-button" data-tab="${escape(group.id)}" aria-label="Open ${escape(group.name)} coordinator">Open ${icon('arrowRight', 15)}</button></header>${specialistRows(group.specialists, selectedAgent)}</section>`).join('')}
    <p class="view-note">Design preview. Each template defines a role, a model profile and editable instructions.</p>
  </section>`;
}
