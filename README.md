# Framation

Framation is a desktop 2D stick-figure animation software.

## Prerequisites

- Node.js 22.12 and npm 10.9. Run `nvm use` from the repository root.
- JDK 21 for the optional Java core. On macOS: `brew install openjdk@21`.

The checked-in VS Code settings and `core:test` script use Homebrew's Apple
Silicon JDK path. Change `JAVA_HOME` and the Java paths in `.vscode/settings.json`
if your JDK is installed elsewhere.

## Setup

```bash
nvm install
nvm use
npm install
npm run check
```

The root `package-lock.json` is the only npm lockfile. Run npm commands from the
repository root so all workspaces stay synchronized.

## Development

```bash
npm run dev
```

This starts the Angular development server and opens it in Electron. Use
`npm start` to build both workspaces and launch the production build.

Useful commands:

| Command             | Purpose                                   |
| ------------------- | ----------------------------------------- |
| `npm run build`     | Build Angular and Electron                |
| `npm test`          | Run Angular unit tests once               |
| `npm run typecheck` | Type-check Electron main and preload code |
| `npm run check`     | Run all JavaScript/TypeScript validation  |
| `npm run core:test` | Run Java core tests with Gradle           |

VS Code recommends the Angular, Java, EditorConfig, ESLint, and Prettier
extensions. Run the `Framation: Dev` or `Framation: Check` task from the Command
Palette for the same workflows.

## Architecture

- `frontend/` - Angular editor UI.
- `desktop/` - Electron main process and isolated preload boundary.
- `core/` - Independent Java animation-engine experiment.
- `docs/` - Project documentation.

This is currently a minimal foundation with no animation features implemented yet.

## License

Business Source License 1.1 (BUSL-1.1). See `/LICENSE`.
