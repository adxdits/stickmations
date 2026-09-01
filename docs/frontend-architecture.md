# Frontend architecture

The Angular editor is organized by ownership under `frontend/src/app`:

The public download site is a separate Angular workspace under `website/` and does not
participate in the editor's dependency graph.

```text
app/
├── domain/      # Framework-free scene data and immutable operations
├── features/    # UI components, co-located with their templates
├── io/          # Browser file decoding
├── rendering/   # Scene-to-SVG preview projection
├── shared/      # Small cross-feature DOM and geometry utilities
├── state/       # Injectable editor state and command stores
├── testing/     # Shared integration-test fixtures and harnesses
├── app.ts       # Root dependency composition
└── app-shell.html
```

## Dependency direction

Dependencies flow toward framework-free code:

```text
app shell -> features -> state/rendering/shared/domain
                    state -> io/rendering/shared/domain
                rendering -> domain
                   shared -> domain (geometry types only)
                   domain -> @framation/engine
```

`domain`, `rendering`, `io`, and `shared` must not import Angular state or UI features.
Features may coordinate through inputs and outputs, but should not reach into sibling components.

## State ownership

- `EditorDocumentState` owns document signals and computed projections.
- `EditorDocumentStore` is the stable command facade for frame, layer, camera, and history actions.
- `EditorProjectStore` owns project creation, file imports, naming, and background assets.
- `EditorHistoryStore` owns undo/redo stacks and grouped edit transactions.
- `EditorViewportStore` owns zoom, pan, tools, and playback preview state.
- `EditorWorkspaceStore` owns panel visibility and canvas focus state.

Pure scene mutations belong in `domain/scene-operations.ts`, not in components or stores.

## UI organization

Each feature folder owns a component and its external template. Extract a child component when a section has an independent input/output contract, as with Inspector camera and background properties. Shared interaction state that does not require Angular belongs in a plain class, such as `CanvasDragController`.

## Tests

Root integration tests are split by behavior (`app.canvas.spec.ts`, `app.animation.spec.ts`, and `app.project.spec.ts`) and share setup through `testing/app-test-harness.ts`. Pure rendering and interaction helpers keep focused specs beside their source.
