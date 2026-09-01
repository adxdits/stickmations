# Stickmations

Stickmations is desktop 2D stick-figure animation software.

## Prerequisites

- Node.js 22.12 and npm 10.9. Run `nvm use` from the repository root.

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
`npm start` to build the application workspaces and launch the production desktop build.
The public website has its own development server:

```bash
npm run dev:website
```

Useful commands:

| Command               | Purpose                                     |
| --------------------- | ------------------------------------------- |
| `npm run dev:website` | Serve only the public download website      |
| `npm run build:app`   | Build only the desktop application          |
| `npm run build`       | Build every workspace                       |
| `npm test`            | Run engine, editor, and website tests once  |
| `npm run typecheck`   | Type-check the engine and Electron sources  |
| `npm run check`       | Build, test, and type-check every workspace |

VS Code recommends the Angular, EditorConfig, ESLint, and Prettier
extensions. Run the `Stickmations: Dev` or `Stickmations: Check` task from the Command
Palette for the same workflows.

## Architecture

- `engine/` - Framework-free figure import, domain model, and kinematics.
- `frontend/` - Angular editor application loaded by Electron.
- `website/` - Independent Angular application for the public download website.
- `desktop/` - Electron main process and isolated preload boundary.

The editor and public website have separate entry points, Angular configuration,
dependencies, assets, builds, and tests. Neither application imports the other.

Dependencies point inward: `engine/` knows nothing about Angular or Electron.
See [Frontend architecture](docs/frontend-architecture.md) for the editor's feature, state,
domain, rendering, and testing boundaries.

## License

Stickmations is source-available and is not currently open source. The source may
be viewed and used according to the Business Source License 1.1 (BUSL-1.1).
Production or commercial use of the licensed source requires compliance with
BUSL-1.1 or a commercial license from the licensor.

The license is currently BUSL-1.1 and is scheduled to change to the Apache
License 2.0 on 2029-08-22. Do not describe Stickmations as "open source" while
BUSL-1.1 applies. See [LICENSE](LICENSE) for the complete license terms.
