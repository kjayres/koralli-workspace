# Koralli Workspace

A standalone prototype for an internal agent workspace. It uses Koralli's cream palette, cobalt line work, local fonts and coral mark. Nereus now has a working evidence, review and saving flow, with an unconfigured model connector for later use.

[Open the interactive demo](https://kjayres.github.io/koralli-workspace/).

## Run locally

Requires Node.js 20 or newer. There are no packages to install.

```sh
cd agent_workspace
npm run dev
```

Open http://127.0.0.1:4180/. The server binds to this computer only.

```sh
npm run check
```

This checks JavaScript syntax. Browser interaction and responsive layout checks are separate.

```sh
npm test
```

Tests cover evidence validation, saved source snapshots, reviews, client lifecycle and the local API. All model responses in tests are simulated; tests make no paid model calls.

## Nereus assessment

[Open the assessment workspace](https://kjayres.github.io/koralli-workspace/#assessment).

1. Open the worked example to inspect a fictional gateway change, its four source records and an authored assessment. No model is used.
2. Follow a finding's citation to its preserved source. A citation match verifies that the quotation exists, not that the reasoning is correct.
3. Add a review note and choose whether to accept the assessment or request changes, then save the review. This does not approve or execute the network change.
4. Export the assessment as JSON to retain its question, evidence, result and saved review together.

You can also create your own draft and add `.txt`, `.md`, `.csv` or `.json` files. Evidence stays in the browser until a configured model run is explicitly started. Files are treated as text; PDF and Word extraction are not implemented. Limits are eight sources, 30,000 characters per source, 80,000 source characters overall, a 2,000-character question and a 6,000-character review note.

The current draft and ten most recent assessment runs are saved in this browser. Clearing site data removes them, and older runs are removed from the local list as new runs are added. Export anything you need to retain. If browser storage is blocked or full, the interface reports that saving is unavailable. Saved assessments retain their original sources when the draft changes. Review edits are saved when you press **Save review**.

### Model connection, when ready

No model is configured or required to explore the worked example. GitHub Pages serves the browser interface only; it does not run the model API and has no credentials.

The local Node server supports an OpenAI-compatible chat-completions endpoint. Its settings are server-side environment variables:

| Variable | Purpose |
| --- | --- |
| `NEREUS_MODEL` | Exact model identifier. Leaving it unset disables model execution. |
| `NEREUS_BASE_URL` | API base URL ending in `/v1`, or the provider's equivalent. Defaults to `http://127.0.0.1:11434/v1`. |
| `NEREUS_API_KEY` | Optional server-side credential for a hosted endpoint. Never put it in frontend code or commit it. |

Restart the local server after changing these settings. Environment files are ignored by Git, but this server does not load them automatically. A configured endpoint is not reported as tested until you actually try a run. Compatibility with a real provider remains to be checked when a model is chosen.

Each explicit run makes one model request, with a 3,000-output-token cap, a two-minute timeout and no automatic retry. Only one run can be active. The response must match the assessment schema and cite quotations found in the supplied evidence. Invalid output is rejected. The displayed token counts come from the provider; monetary cost is not estimated when the provider does not report it. These limits bound work, not a guaranteed monetary price.

Cancellation stops local processing and aborts the request; a provider may still bill work it has already performed. Reconnecting checks an existing run without submitting it again. If the local server restarts, its in-memory jobs are lost; their saved input snapshots remain in the browser for a new run. The server retains up to twenty recent job records while running. This loopback-only service is a local development scaffold, not a deployed multi-user backend.

## What works

- Explorer, tabs, workflow canvas, inspector and activity drawer
- Poseidon coordinating four teams, with task, priority and compute-allowance controls
- Expandable specialist teams, coordinator detail views and ordered handover previews
- Custom coordinator symbols and marine icons for sixteen specialists, plus the original research, analysis and review agents
- Selectable workflow steps, canvas zoom and a local sequence preview
- Agent library with independently editable instructions
- Source inspection and references from an example brief
- Editable Markdown notes and document export
- New workspace tabs, a searchable command menu and density preferences
- Responsive layouts and reduced-motion support
- Nereus evidence files, clickable source quotations, saved assessments and human reviews
- Explicit worked example, JSON export and a bounded local model-connection scaffold

All bundled project content is fictional. The delivery sequence preview highlights steps; it does not run agents. The public demo has no model calls, accounts or connections to company systems. Selecting evidence files reads them locally. The local Nereus server can make a model request only after it has been configured and the user explicitly starts an assessment.

Poseidon's route preview uses illustrative rules. Its model profiles describe proposed capabilities, not measured recommendations. No performance history or learned policy exists yet. Link directly to it with `#poseidon` or open the delivery example with `#workflow`.

| Coordinator | Responsibility | Specialist team | Direct link |
| --- | --- | --- | --- |
| Galene | Network uptime and recovery planning | The Halcyons | `#galene` |
| Nereus | System stability and safe change | The Nereids | `#nereus` |
| Proteus | Labelled roles, scenarios and authorised representations | The Forms | `#proteus` |
| Triton | Briefings, transcription, voice and channel formatting | The Heralds | `#triton` |

Each coordinator has four specialist templates. Task previews select the relevant coordinators; resource settings do not remove review requirements. The team names are brand metaphors, not claims of literal mythological relationships. Halcyons refer to calm seas, while Heralds draws on Triton's role as Poseidon's messenger.

General notes, workspace tabs and agent instructions last until the page is reloaded. Export notes to retain them. The spacing preference and Nereus assessment workspace are stored in this browser.

## Keyboard controls

Use Command on macOS or Control on Windows/Linux:

| Keys | Action |
| --- | --- |
| Command/Control + K | Command menu |
| Command/Control + B | Toggle explorer |
| Command/Control + J | Toggle activity |
| Command/Control + . | Toggle inspector |
| Escape | Close a dialog |

## Source files

- `app.mjs`: shell, example content and local interaction state
- `styles.css`: visual system and responsive app layout
- `workflow.mjs`, `workflow.css`: workflow diagram and its layout
- `poseidon.mjs`, `poseidon.css`: coordination map, model profiles and handover preview
- `fleet.mjs`: coordinator and specialist definitions, remits and draft instructions
- `team-view.mjs`, `team-view.css`: coordinator details and grouped agent library
- `assessment-view.mjs`, `assessment.css`: evidence workspace, findings, source reader and review
- `assessment-client.mjs`, `assessment-store.mjs`: local interaction, immutable run snapshots and persistence
- `assessment-core.mjs`, `assessment-example.mjs`: bounded schemas, citation validation and fictional reference case
- `nereus-service.mjs`: unconfigured single-request model adapter with cancellation and validated output
- `tests/`: native Node tests with simulated model responses
- `icons.mjs`: custom thin-line SVG icon family
- `assets/`: local fonts, Koralli mark and coral network illustration
- `server.mjs`: loopback-only development server and assessment API, using Node's standard library

The project is independent of `new_site` and `old_site`. Changes here do not deploy either website.

## Publishing

The demo is hosted by GitHub Pages from the root of the `main` branch in `kjayres/koralli-workspace`. The `.nojekyll` file keeps the static files unchanged. Push reviewed changes to that repository to update the shareable demo. Local screenshots in `.preview/` are excluded from Git.

## Product direction

The reef is a useful model for a team of complementary specialists: distinct roles, shared context, visible relationships and contributions that can be inspected. Model diversity is one possible design choice, not evidence of better performance by itself.

Start by defining a small set of roles and evaluating them on real tasks. Models can be configured before deciding whether any training is warranted. Nereus provides the first evidence and review scaffold. Later work would add shared project storage, tested model connections, tool execution and evaluation across coordinators.

Poseidon is the proposed orchestrator. Its aim is to learn which combinations of specialist, model and compute allocation work well for different tasks. The learning signal would combine evaluated results, human feedback, latency and resource use. We would compare learned routing against simple fixed routes on held-out tasks before claiming an improvement. A specialist's role stays separate from the model assigned to it.

A VS Code fork is unnecessary for this workspace. If code editing becomes part of the product, an embeddable editor can be added to one pane. A full development environment with terminal, debugger and extension compatibility would be a different scope.
