# SmartTasks

Lightweight task graph editor: drag nodes, link/unlink tasks, write Markdown descriptions, and autosave to your browser. No build tools, no frameworks.

## Live Demo

* [https://cosmic-slothstronauts.github.io/SmartTasks](https://cosmic-slothstronauts.github.io/SmartTasks)

## Features

* Drag-and-drop nodes with live link re-routing
* Link and unlink mode (with context menu and long‑press on touch)
* Inline title rename; bold task titles
* Per-task description with Markdown preview (global Edit/Preview toggle)
* Autosave to `localStorage` (positions, titles, descriptions, link graph, expanded state)
* Dark/light theme toggle with persistence
* Optional semantic colouring of tasks via on-device embeddings

## Quick start (local)

```bash
# clone and serve with any static server
git clone https://github.com/cosmic-slothstronauts/SmartTasks.git
cd SmartTasks

# install dev dependencies (optional)
npm install

# run tests
npm test

# start dev server
npm run dev  # or python -m http.server 8000

# then visit http://localhost:3000 (or 8000)
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

### Project Structure
```
SmartTasks/
├── index.html              # Main entry point
├── styles/main.css          # Extracted styles
├── src/
│   ├── main.js             # Application entry point (ES module)
│   ├── app/
│   │   ├── constants.js    # Configuration constants
│   │   ├── state.js        # Application state management
│   │   └── ui/             # UI modules
│   │       ├── node.js     # Node creation/management
│   │       └── links.js    # Link management
│   └── persistence/
│       └── storage.js      # localStorage operations
├── tests/                  # Test files
├── package.json            # Dev dependencies and scripts
└── README.md
```

### Core Architecture
* **Modular ES6**: Code split into focused modules with clear responsibilities
* **Two layers**: SVG **linkLayer** under absolutely positioned **nodesLayer**
* **State management**: Centralized state in `src/app/state.js`
* **Persistence**: localStorage operations isolated in `src/persistence/storage.js`
* **No build step**: Direct ES module loading for GitHub Pages compatibility

## Development

### Available Scripts
- `npm test` - Run verification tests
- `npm run dev` - Start development server on port 3000
- `npm run lint` - Lint JavaScript files
- `npm run format` - Format code with Prettier

### Testing
- `verify.js` - Core functionality verification
- `test-seed.js` - Seed data functionality tests
- Additional tests in `tests/` directory

## Deploy

* Static site. GitHub Pages serves directly from the repository root
* No build step required - ES modules load directly in modern browsers
* Update by committing changes to `main` branch

## Contributing

Issues and pull requests welcome. Keep PRs small and focused. Please lint for obvious typos and test drag/link on both mouse and touch.

