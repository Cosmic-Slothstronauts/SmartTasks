# SmartTasks

Lightweight graph editor for tasks and notes: drag nodes, link/unlink items, write Markdown descriptions, and autosave to your browser. No build tools, no frameworks.

## Live Demo

* [https://cosmic-slothstronauts.github.io/SmartTasks](https://cosmic-slothstronauts.github.io/SmartTasks)

## Features

* Drag-and-drop nodes with live link re-routing
* Link and unlink mode (with context menu and long‑press on touch)
* Inline title rename; bold task titles
* Modern card-style nodes with collapsible descriptions
* Per-task description with Markdown preview (global Edit/Preview toggle)
* Autosave to `localStorage` (positions, titles, descriptions, link graph, expanded state)
* Dark/light theme toggle with persistence
* Optional semantic colouring of tasks via on-device embeddings

## Quick start (local)

```bash
# clone and serve with any static server
git clone https://github.com/cosmic-slothstronauts/SmartTasks.git
cd SmartTasks
# open index.html directly, or run a local server
python -m http.server 8000  # then visit http://localhost:8000
```

## Usage

* **Create task**: open ☰ menu, type a title, press Enter
* **Rename**: double‑click the title
* **Toggle description**: caret button on each node
* **Global Edit/Preview**: top‑right button (applies to all nodes)
* **Context menu**: right‑click or long‑press node/canvas
* **Keyboard**: `L` link mode, `U` unlink mode, `Esc` cancel, `Delete` removes selected node (not while typing)

## Data & storage

* Saved in `localStorage`
* Includes: `nextId`, every node’s title/description/position/open-state, and all links
* Clear your browser storage to reset

## Architecture

* Single `index.html` containing CSS and vanilla JS
* Two layers: SVG **linkLayer** under absolutely positioned **nodesLayer**
* Links are kept in-memory and redrawn on resize/drag
* Markdown is rendered by a small in-file function; no external library

## Deploy

* Static site. GitHub Pages serves directly from the repository root
* Update by committing a new `index.html` to `main`

## Contributing

Issues and pull requests welcome. Keep PRs small and focused. Please lint for obvious typos and test drag/link on both mouse and touch.

