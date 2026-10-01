import { icon } from './icons.mjs';

export const flowNodes = [
  { id:'sources',title:'Project sources',role:'Context',description:'The material available to this workflow. Choose a small, relevant set of records before work begins.',inputs:['Delivery register','Working notes','Decision log'],output:'Selected evidence',access:'Read selected material',status:'3 example sources',icon:'library'},
  { id:'research',title:'Read & reconcile',role:'Research agent',description:'Read the selected material, connect related records and surface inconsistencies. Keep a source behind every finding.',inputs:['Selected evidence'],output:'Sourced findings',access:'Read sources · create drafts',status:'Ready to configure',icon:'agent'},
  { id:'analysis',title:'Compare delivery',role:'Analysis agent',description:'Compare delivery records with the plan and separate confirmed progress from open questions.',inputs:['Sourced findings','Delivery register'],output:'Progress, blockers and decisions',access:'Read evidence · draft analysis',status:'Ready to configure',icon:'layers'},
  { id:'review',title:'Review the brief',role:'Human review',description:'Review the evidence, resolve open questions and decide whether the result is ready to use.',inputs:['Draft brief','Evidence references'],output:'Reviewed brief',access:'Review · request changes · approve',status:'Project lead',icon:'shield'},
  { id:'output',title:'Weekly brief',role:'Document',description:'A durable document for the team, with its supporting evidence and review history kept alongside it.',inputs:['Reviewed brief'],output:'A document your team can use',access:'Save draft · share after approval',status:'Example document',icon:'document'}
];

export function renderWorkflow({selectedNode='research',zoom=1}={}) {
  return `<section class="workflow-view" aria-label="Delivery review workflow">
    <header class="wf-header"><div><p class="eyebrow">WORKFLOW / 001</p><h1>From records to a clearer picture.</h1><p>Specialist agents, shared evidence and human judgement.</p></div><div class="wf-coral"><img src="./assets/coral-network.svg" width="240" height="112" alt=""><span class="draft-label"><i></i>Draft</span></div></header>
    <div class="wf-canvas" tabindex="0" aria-label="Workflow canvas. Select a node to inspect its role.">
      <div class="wf-map-space" style="--zoom:${zoom}"><div class="wf-map">
        <svg class="wf-lines" viewBox="0 0 800 425" aria-hidden="true"><g fill="none" stroke="currentColor" stroke-width="1"><path d="M174 106H206Q228 106 228 134V189H263 M174 175H210Q228 175 228 189H263 M174 244H206Q228 244 228 216V189H263 M445 189H521 M611 224V288 M521 333H445"/><path class="wf-fine" d="M179 99H212Q235 99 235 134V183H262 M179 252H212Q235 252 235 217V196H262 M445 185H521 M445 193H521 M607 224V288 M615 224V288 M521 329H445 M521 337H445"/></g><g fill="var(--paper)" stroke="currentColor" stroke-width="1"><circle cx="228" cy="189" r="3"/><circle cx="483" cy="189" r="3"/><circle cx="611" cy="258" r="3"/><circle cx="483" cy="333" r="3"/></g></svg>
        <div class="wf-source-group"><p class="mono">SELECTED CONTEXT</p>${['Delivery register','Working notes','Decision log'].map((name,i)=>`<button class="wf-source ${selectedNode==='sources'?'selected':''}" data-node="sources" aria-label="Inspect project sources: ${name}">${icon(i===0?'database':'document',18)}<span>${name}</span><span class="wf-port"></span></button>`).join('')}<span class="wf-group-note">Read only · example material</span></div>
        ${flowNodes.filter(n=>n.id!=='sources').map(n=>`<button class="wf-node wf-${n.id} ${selectedNode===n.id?'selected':''}" data-node="${n.id}" aria-pressed="${selectedNode===n.id}"><span class="wf-node-top">${icon(n.icon,22)}<span class="mono">${n.role}</span></span><strong>${n.title}</strong><span class="wf-node-bottom">${n.id==='review'?'A person decides':n.id==='output'?'The work, made useful':'Evidence stays attached'}${icon('arrowRight',13)}</span></button>`).join('')}
        <span class="wf-path-label wf-label-one">findings</span><span class="wf-path-label wf-label-two">draft</span><span class="wf-path-label wf-label-three">approved</span>
      </div></div>
    </div>
    <footer class="wf-footer"><span class="mono">5 STEPS <b>·</b> SELECT A NODE TO INSPECT</span><div class="wf-zoom" aria-label="Canvas zoom"><button class="icon-button" data-action="zoom-out" aria-label="Zoom out">−</button><span class="mono">${Math.round(zoom*100)}%</span><button class="icon-button" data-action="zoom-in" aria-label="Zoom in">+</button><button class="fit-button" data-action="fit">Fit</button></div></footer>
  </section>`;
}
