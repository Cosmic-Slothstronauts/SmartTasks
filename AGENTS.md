# AGENTS

## Overview
SmartTasks is a single-file web app for managing task graphs. The repository is intentionally minimal: HTML, CSS, and JavaScript live together in `index.html` with no build step.

## Style
- Keep the application in a single `index.html` file.
- Use vanilla JavaScript and CSS only; avoid frameworks, bundlers, or transpilers.
- Follow the existing two-space indentation and formatting.
- Favor small, focused functions and keep scripts inside the existing `<script>` block.

## Testing
- Run `npm test` after making changes. This executes `verify.js` and `test-seed.js`.
- If you modify semantic colouring logic or related code, also run `node test-semantic-units.js`.
- Ensure all tests pass before committing.

## Documentation & PRs
- Update `README.md` when you add or change user-facing features.
- Keep pull requests small and focused.
- Provide clear commit messages describing the motivation for your change.
