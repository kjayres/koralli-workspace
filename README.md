# Koralli Workspace

A standalone visual template for an internal agent workspace. It uses Koralli's cream palette, cobalt line work, local fonts and coral mark.

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

## What works

- Explorer, tabs, workflow canvas, inspector and activity drawer
- Selectable workflow steps, canvas zoom and a local sequence preview
- Agent library with independently editable instructions
- Source inspection and references from an example brief
- Editable Markdown notes and document export
- New workspace tabs, a searchable command menu and density preferences
- Responsive layouts and reduced-motion support

All project content is fictional. The sequence preview highlights steps; it does not run agents. There are no model calls, accounts, uploads or connections to company systems.

Notes, workspace tabs and agent instructions last until the page is reloaded. Export notes to retain them. Only the spacing preference is stored in this browser.

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
- `icons.mjs`: custom thin-line SVG icon family
- `assets/`: local fonts, Koralli mark and coral network illustration
- `server.mjs`: small development server using Node's standard library

The project is independent of `new_site` and `old_site`. Changes here do not deploy either website.

## Publishing

The demo is hosted by GitHub Pages from the root of the `main` branch in `kjayres/koralli-workspace`. The `.nojekyll` file keeps the static files unchanged. Push reviewed changes to that repository to update the shareable demo. Local screenshots in `.preview/` are excluded from Git.

## Product direction

The reef is a useful model for a team of complementary specialists: distinct roles, shared context, visible relationships and contributions that can be inspected. Model diversity is one possible design choice, not evidence of better performance by itself.

Start by defining a small set of roles and evaluating them on real tasks. Models can be configured before deciding whether any training is warranted. A later implementation would add durable projects, model adapters, tools, evidence tracking, execution state and human review.

A VS Code fork is unnecessary for this workspace. If code editing becomes part of the product, an embeddable editor can be added to one pane. A full development environment with terminal, debugger and extension compatibility would be a different scope.
