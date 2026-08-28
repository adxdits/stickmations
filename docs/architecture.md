# Architecture

Framation is a desktop stick-figure animator. This document records the layer
boundaries, the two data-model decisions that are expensive to reverse, and how
the SOLID principles are actually applied to this codebase.

The engine source files exist but are empty placeholders. What follows is the
intended design, not a description of code that is already written.

## Layers and the dependency rule

```
desktop/  Electron main + preload      -+
frontend/ Angular UI + Canvas renderer -+ adapters
                                        |
engine/   ports (interfaces)           -+ boundary
engine/   domain (types + pure maths)  -+ policy
```

**Dependencies point inward.** `engine/` imports nothing from Angular, Electron,
or the DOM — it is plain TypeScript with no runtime dependencies. Adapters
depend on the engine; the engine never depends on an adapter.

The payoff is concrete, not architectural theatre:

- Engine tests run in milliseconds with no browser and no Electron process.
- The editor can run in a plain browser tab during development, which is a far
  faster loop than restarting Electron.
- Swapping Canvas 2D for WebGL, or adding a headless renderer for video export,
  touches one adapter.

## Module map

| Path                            | Responsibility                                           |
| ------------------------------- | -------------------------------------------------------- |
| `engine/src/domain/`            | Figure structure, poses, project document, pure maths     |
| `engine/src/ports/`             | Interfaces the engine needs the outside world to satisfy  |
| `engine/src/testing/`           | Substitutable doubles for those ports                     |
| `frontend/src/app/composition/` | Composition root: binds ports to adapters                 |
| `desktop/src/`                  | Window lifecycle, file system, preload trust boundary     |

## Decision: the engine is TypeScript, not the Java core

`core/` is parked. It is not on the critical path and nothing depends on it.

The rejected option was a JVM engine behind the Electron shell. The renderer is
Chromium, so a Java engine would sit in a separate process, and resolved figure
state would have to cross that boundary on every dragged frame inside a 16ms
budget - serialising hundreds of nodes sixty times a second to compute
trigonometry that takes microseconds in JavaScript. It would also mean bundling
a JRE per platform, managing JVM lifecycle, and maintaining the same data model
in two languages with a serialisation contract between them.

A JVM core earns its keep for heavy computation - physics, video encoding, mesh
deformation. Stick-figure kinematics is trigonometry over a few hundred nodes.

The genuine counter-argument was code sharing with a future Android build. If
that becomes a goal, the answer is Kotlin Multiplatform and an all-JVM desktop
app (Compose Desktop or JavaFX, packaged with jpackage), not a JVM subprocess
inside Electron. The incoherent middle - Java core, Electron UI - pays the cost
of both stacks and gets the benefit of neither.

The domain design is language-independent: polar poses, the topology/pose split
and the ports port to Kotlin close to line for line if that decision is ever
revisited.

Because `core/` is parked, `npm run check` no longer runs `core:test`. That
script is still available on its own, but it hardcodes a macOS Homebrew
JAVA_HOME and invokes the shell `gradlew`, so it does not run on Windows as
written.

## Two decisions that are expensive to reverse

### 1. Poses are polar, relative to the parent

A node stores `{ angle, length, scale }` where `angle` is relative to its
parent's world angle — never an absolute `{ x, y }`. World positions are derived
by `resolveFigure()` and never persisted.

Interpolating an angle sweeps a limb along an arc, which is what makes a tweened
frame read as motion. Interpolating absolute points moves joints along straight
lines, so limbs visibly stretch and slide through the in-betweens. Every tween,
every smooth playback, and any future easing curve depends on this choice.

### 2. Topology lives in the project; frames store only values

`Project.figures` holds structure — which nodes exist, how they connect, what
colour and shape they are. `Frame.poses` holds only the animated values for
those nodes.

If frames each held a full copy of a figure, adding one node would mean
migrating every frame in the document, and the two copies would drift. With the
split, a node added today resolves on a frame authored last week:
`resolveFigure()` falls back to `DEFAULT_NODE_POSE` for values the older frame
never recorded.

`Project.schemaVersion` is written from the first save so the format can change
without orphaning existing files.

## SOLID, applied here

### S — Single responsibility

Each module has one reason to change. The failure mode this avoids is the god
object every hobby editor grows: an `Editor` class holding state, hit-testing
pointers, painting pixels, and writing files, which every future feature has to
edit.

The split:

| Concern                                    | Owner                             |
| ------------------------------------------ | --------------------------------- |
| Where a node sits                          | `domain/kinematics.ts`            |
| What a frame between two frames looks like | `domain/interpolation.ts`         |
| Turning state into pixels                  | the `Renderer` adapter            |
| Reading and writing documents              | the `ProjectRepository` adapter   |
| Choosing a file path                       | the `ProjectDialogs` adapter      |

The enforceable rule: **rendering code never mutates the model, and model code
never touches a drawing context.** Domain modules import no adapter and no
browser global.

### O — Open for extension, closed for modification

Three places will grow forever, and only those three get an extension seam:

- **Shapes.** `ShapeKind` covers segment, circle, ellipse, rectangle, triangle,
  and will grow. A `switch (node.shape)` inside the renderer means editing the
  renderer for every new shape. Adapters resolve a painter from a registry keyed
  by `ShapeKind`, so a new shape registers a painter and edits nothing.
- **Tools.** Select, add node, delete, recolour, pan. A `Tool` interface with
  `onPointerDown/Move/Up`, held in a registry.
- **Exporters.** PNG sequence, GIF, MP4, sprite sheet — one `Exporter`
  interface.

`SceneFigure.opacity` exists for the same reason: onion skinning becomes a
matter of pushing ghost figures into the scene, not of changing the renderer.

### L — Liskov substitution

A double must be substitutable for the real adapter, or tests certify behaviour
production does not have. `MemoryProjectRepository` throws the same
`ProjectNotFoundError` on a missing ref as the Electron implementation will; had
it resolved `undefined` instead, every test of the "file is gone" path would be
a lie.

The same contract binds shape painters. Each must honour `draw`, `hitTest`, and
`bounds`. A circle painter that returns `null` bounds because "a circle has no
length" breaks hit-testing and selection rectangles for every caller that was
written against the interface.

### I — Interface segregation

The sharpest example is the **preload bridge** in `desktop/src/preload.ts`. It
is a security boundary, not just a convenience: whatever it exposes is reachable
by any script in the renderer. So it exposes narrow, purpose-built surfaces —
`files.open()`, `files.save()`, `window.setTitle()` — never one
`window.framation` object carrying everything the main process can do. A smaller
interface is both a smaller coupling surface and a smaller attack surface.

The same reasoning splits `ProjectRepository` (bytes in, bytes out) from
`ProjectDialogs` (ask the user where). Autosave needs the first and must not
depend on the second. Timeline components receive the frame list and current
index, not the whole `Project`.

### D — Dependency inversion

Policy depends on abstractions; adapters supply the details. Angular components
never `import { ipcRenderer }` or construct a `Canvas2DRenderer`. They inject
`CLOCK`, `ID_GENERATOR`, `PROJECT_REPOSITORY` — tokens declared in
`frontend/src/app/composition/tokens.ts` and bound exactly once, in
`app.config.ts`.

Two ports exist purely because inverting them buys testability:

- `Clock` — playback tests advance a `FakeClock` by hand instead of waiting on
  `requestAnimationFrame` in real seconds.
- `IdGenerator` — `SequentialIdGenerator` makes new nodes and frames
  deterministic, so assertions and undo history are reproducible.

`PROJECT_REPOSITORY` is deliberately left unbound until the Electron adapter
exists. Injecting it today throws, which is correct: better a loud failure than
a stub that silently discards work.

## Where not to abstract

Over-abstraction is the likelier failure here than under-abstraction. No
interface goes in front of `resolveFigure` or the interpolation helpers — they
are pure functions with one correct implementation and no I/O, so an interface
would add indirection and buy nothing. A seam is justified when there is a real
second implementation (a test double counts) or a boundary that must be crossed.

## Build order

1. **Engine domain** — types, kinematics, interpolation. Files are scaffolded
   and intentionally empty; this document is the specification to build them to.
2. **Canvas renderer** — one figure, one static pose. Run the loop in
   `NgZone.runOutsideAngular` with a dirty flag; never let change detection
   drive painting. Scale by `devicePixelRatio` from the start.
3. **Drag a node** — hit-test in screen space, set the dragged node's angle to
   point at the cursor. Children keep their relative angles, so the subtree
   swings along. This is the whole feel of the app.
4. **Timeline** — add, duplicate, delete, scrub, play. Duplicate-then-adjust is
   the core workflow and must be one click.
5. **Save and load** — `ipcMain.handle` plus dialogs behind the repository port.
6. **Undo/redo** — whole-project snapshots on a stack. Scenes are small; command
   diffing is premature and much harder to keep correct.

Onion skinning, camera, easing curves, particles, and video export come after.
Importing the file formats of other animators is a reverse-engineering project
of its own and teaches nothing about this engine — defer it.
