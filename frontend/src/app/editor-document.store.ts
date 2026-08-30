import { Injectable, computed, inject, signal } from '@angular/core';
import type { StickFigure } from '@framation/engine';
import type { FigureOperation, TransformChange } from './animation-frame';
import { parseFigureFile, readFileAsDataUrl } from './editor-file-import';
import {
  appendHistory,
  reorderFrames,
  type EditorSnapshot,
  type FrameMove,
} from './editor-history';
import { EditorViewportStore } from './editor-viewport.store';
import { createFigurePreview, createScenePreview } from './figure-preview';
import {
  addFigureLayer,
  applyCameraChange,
  applyLayerFigureOperation,
  applyLayerTransformChange,
  cloneSceneFrame,
  createFigureLayer,
  createSceneCamera,
  createSceneFrame,
  moveFigureLayer,
  removeFigureLayer,
  setFigureLayerVisibility,
  updateFigureLayer,
  type BackgroundChange,
  type CameraChange,
  type FigureLayer,
  type LayerMove,
  type SceneBackground,
  type SceneCamera,
  type SceneFrame,
} from './scene-frame';

const DEFAULT_BACKGROUND: SceneBackground = {
  color: '#ffffff',
  imageUrl: null,
  imageName: null,
  fit: 'cover',
  scale: 100,
  positionX: 0,
  positionY: 0,
};
const DEFAULT_FPS = 12;

@Injectable({ providedIn: 'root' })
export class EditorDocumentStore {
  private readonly viewport = inject(EditorViewportStore);

  readonly title = signal('Framation');
  readonly animationFrames = signal<readonly SceneFrame[]>([]);
  readonly importError = signal<string | null>(null);
  readonly currentFrame = signal(1);
  readonly fps = signal(DEFAULT_FPS);
  readonly selectedFigureId = signal<string | null>(null);
  readonly canUndo = computed(() => this.undoStack().length > 0);
  readonly canRedo = computed(() => this.redoStack().length > 0);
  readonly currentScene = computed<SceneFrame | null>(() => {
    const frames = this.animationFrames();
    const frameIndex = this.currentFrame() - 1;
    return frameIndex >= 0 && frameIndex < frames.length ? frames[frameIndex]! : null;
  });
  readonly selectedLayer = computed<FigureLayer | null>(() => {
    const figures = this.currentScene()?.figures ?? [];
    return figures.find(({ id }) => id === this.selectedFigureId()) ?? figures[0] ?? null;
  });
  readonly importedFigure = computed<StickFigure | null>(
    () => this.selectedLayer()?.figure ?? null,
  );
  readonly currentTransform = computed(() => this.selectedLayer()?.transform ?? null);
  readonly preview = computed(() => createScenePreview(this.currentScene()?.figures ?? []));
  readonly selectedPreview = computed(() => {
    const layer = this.selectedLayer();
    return layer?.visible ? createFigurePreview(layer.figure) : null;
  });
  readonly currentBackground = computed<SceneBackground>(
    () => this.currentScene()?.background ?? DEFAULT_BACKGROUND,
  );
  readonly currentCamera = computed(() => this.currentScene()?.camera ?? null);
  readonly framePreviews = computed(() =>
    this.animationFrames().map(({ figures }) => createScenePreview(figures)),
  );
  readonly frameBackgrounds = computed(() =>
    this.animationFrames().map(({ background }) => background),
  );
  readonly frameCameras = computed(() => this.animationFrames().map(({ camera }) => camera));

  async importFigure(file: File): Promise<void> {
    try {
      const importedFigure = await parseFigureFile(file);
      const figure = {
        ...importedFigure,
        name: this.uniqueFigureName(importedFigure.name),
      };
      const layerId = `figure-${this.nextFigureId++}`;
      if (this.animationFrames().length === 0) {
        const figurePreview = createFigurePreview(figure);
        const camera = createSceneCamera(figurePreview.viewBox);
        this.animationFrames.set([createSceneFrame(createFigureLayer(layerId, figure), camera)]);
        this.viewport.reset(cameraEditorViewBox(camera));
        this.currentFrame.set(1);
        this.resetHistory();
      } else {
        this.recordHistory();
        const frameIndex = this.currentFrame() - 1;
        this.animationFrames.update((frames) =>
          frames.map((frame, index) =>
            index >= frameIndex ? addFigureLayer(frame, createFigureLayer(layerId, figure)) : frame,
          ),
        );
      }
      this.selectedFigureId.set(layerId);
      this.importError.set(null);
      this.viewport.controlMode.set('none');
    } catch (error: unknown) {
      this.importError.set(
        error instanceof Error ? error.message : 'The figure could not be imported.',
      );
    }
  }

  async importFigures(files: readonly File[]): Promise<void> {
    const groupImport = this.animationFrames().length > 0;
    if (groupImport) {
      this.beginFrameEdit();
    }
    try {
      for (const file of files) {
        await this.importFigure(file);
      }
    } finally {
      if (groupImport) {
        this.endFrameEdit();
      }
    }
  }

  createBlankProject(): void {
    const frame = createSceneFrame();
    this.animationFrames.set([frame]);
    this.viewport.reset(cameraEditorViewBox(frame.camera));
    this.currentFrame.set(1);
    this.fps.set(DEFAULT_FPS);
    this.selectedFigureId.set(null);
    this.importError.set(null);
    this.resetHistory();
  }

  addFrame(): void {
    const frame = this.animationFrames()[this.currentFrame() - 1];
    if (!frame) {
      return;
    }

    this.recordHistory();
    const insertAt = this.currentFrame();
    this.animationFrames.update((frames) => [
      ...frames.slice(0, insertAt),
      cloneSceneFrame(frame),
      ...frames.slice(insertAt),
    ]);
    this.currentFrame.set(insertAt + 1);
  }

  addBlankFrame(): void {
    const frames = this.animationFrames();
    if (frames.length === 0) {
      this.createBlankProject();
      return;
    }

    this.recordHistory();
    const insertAt = this.currentFrame();
    this.animationFrames.set([
      ...frames.slice(0, insertAt),
      createSceneFrame(),
      ...frames.slice(insertAt),
    ]);
    this.currentFrame.set(insertAt + 1);
    this.selectedFigureId.set(null);
  }

  updateCurrentFrame(figure: StickFigure): void {
    const layerId = this.selectedLayer()?.id;
    if (!layerId) {
      return;
    }

    this.recordHistory();
    const frameIndex = this.currentFrame() - 1;
    this.animationFrames.update((frames) =>
      frames.map((frame, index) => {
        if (index !== frameIndex) {
          return frame;
        }
        return updateFigureLayer(frame, layerId, (layer) => {
          const root = figure.joints[0];
          return {
            ...layer,
            figure,
            transform: {
              ...layer.transform,
              positionX: root?.x ?? layer.transform.positionX,
              positionY: root?.y ?? layer.transform.positionY,
            },
          };
        });
      }),
    );
  }

  updateTransform(change: TransformChange): void {
    const layerId = this.selectedLayer()?.id;
    if (!layerId) {
      return;
    }

    this.recordHistory();
    const frameIndex = this.currentFrame() - 1;
    this.animationFrames.update((frames) =>
      frames.map((frame, index) =>
        index === frameIndex ? applyLayerTransformChange(frame, layerId, change) : frame,
      ),
    );
  }

  updateCamera(change: CameraChange): void {
    const frameIndex = this.currentFrame() - 1;
    if (!this.animationFrames()[frameIndex]) {
      return;
    }

    this.recordHistory();
    this.animationFrames.update((frames) =>
      frames.map((frame, index) =>
        index === frameIndex ? applyCameraChange(frame, change) : frame,
      ),
    );
  }

  applySelectedFigureOperation(operation: FigureOperation): void {
    const layerId = this.selectedLayer()?.id;
    if (!layerId) {
      return;
    }

    this.recordHistory();
    const frameIndex = this.currentFrame() - 1;
    this.animationFrames.update((frames) =>
      frames.map((frame, index) =>
        index === frameIndex ? applyLayerFigureOperation(frame, layerId, operation) : frame,
      ),
    );
  }

  selectFigure(layerId: string): void {
    this.selectedFigureId.set(layerId);
  }

  deleteFigure(layerId: string): void {
    const currentFigures = this.currentScene()?.figures ?? [];
    const layerIndex = currentFigures.findIndex(({ id }) => id === layerId);
    if (layerIndex < 0) {
      return;
    }

    this.recordHistory();
    this.animationFrames.update((frames) =>
      frames.map((frame) => removeFigureLayer(frame, layerId)),
    );
    const remaining = currentFigures.filter(({ id }) => id !== layerId);
    this.selectedFigureId.set(remaining[Math.min(layerIndex, remaining.length - 1)]?.id ?? null);
  }

  deleteSelectedFigure(): void {
    const layerId = this.selectedLayer()?.id;
    if (layerId) {
      this.deleteFigure(layerId);
    }
  }

  setFigureVisibility(layerId: string, visible: boolean): void {
    this.recordHistory();
    this.animationFrames.update((frames) =>
      frames.map((frame) => setFigureLayerVisibility(frame, layerId, visible)),
    );
  }

  moveFigure(move: LayerMove): void {
    const frameIndex = this.currentFrame() - 1;
    const current = this.animationFrames()[frameIndex];
    if (!current || moveFigureLayer(current, move) === current) {
      return;
    }

    this.recordHistory();
    this.animationFrames.update((frames) =>
      frames.map((frame, index) => (index >= frameIndex ? moveFigureLayer(frame, move) : frame)),
    );
    this.selectedFigureId.set(move.layerId);
  }

  setBackgroundColor(color: string): void {
    if (this.animationFrames().length === 0) {
      this.createBlankProject();
    }
    this.updateBackground({ ...this.currentBackground(), color });
  }

  async importBackground(file: File): Promise<void> {
    try {
      const imageUrl = await readFileAsDataUrl(file);
      if (this.animationFrames().length === 0) {
        this.createBlankProject();
      }
      this.updateBackground({ ...this.currentBackground(), imageUrl, imageName: file.name });
      this.importError.set(null);
    } catch (error: unknown) {
      this.importError.set(
        error instanceof Error ? error.message : 'The background image could not be read.',
      );
    }
  }

  clearBackgroundImage(): void {
    this.updateBackground({ ...this.currentBackground(), imageUrl: null, imageName: null });
  }

  updateBackgroundTransform(change: BackgroundChange): void {
    if (this.animationFrames().length === 0) {
      this.createBlankProject();
    }

    const background = this.currentBackground();
    switch (change.property) {
      case 'fit':
        this.updateBackground({ ...background, fit: change.value });
        break;
      case 'scale':
        this.updateBackground({
          ...background,
          scale: Math.min(500, Math.max(10, change.value)),
        });
        break;
      case 'positionX':
        this.updateBackground({ ...background, positionX: change.value });
        break;
      case 'positionY':
        this.updateBackground({ ...background, positionY: change.value });
        break;
    }
  }

  resetBackgroundTransform(): void {
    const background = this.currentBackground();
    this.updateBackground({
      ...background,
      fit: DEFAULT_BACKGROUND.fit,
      scale: DEFAULT_BACKGROUND.scale,
      positionX: DEFAULT_BACKGROUND.positionX,
      positionY: DEFAULT_BACKGROUND.positionY,
    });
  }

  beginFrameEdit(): void {
    if (!this.pendingEdit) {
      this.pendingEdit = this.snapshot();
      this.editRecorded = false;
    }
  }

  endFrameEdit(): void {
    this.pendingEdit = null;
    this.editRecorded = false;
  }

  deleteFrame(): void {
    const frames = this.animationFrames();
    if (frames.length <= 1) {
      return;
    }

    this.recordHistory();
    const frameIndex = this.currentFrame() - 1;
    this.animationFrames.set(frames.filter((_, index) => index !== frameIndex));
    this.selectFrame(Math.min(this.currentFrame(), frames.length - 1));
  }

  moveFrame(move: FrameMove): void {
    const frames = this.animationFrames();
    const selected = frames[this.currentFrame() - 1];
    const reordered = reorderFrames(frames, move);
    if (reordered === frames) {
      return;
    }

    this.recordHistory();
    this.animationFrames.set(reordered);
    this.selectFrame(selected ? reordered.indexOf(selected) + 1 : 1);
  }

  selectRelativeFrame(offset: number): void {
    const total = this.animationFrames().length;
    if (total > 0) {
      this.selectFrame(Math.min(total, Math.max(1, this.currentFrame() + offset)));
    }
  }

  selectFrame(frameNumber: number): void {
    const frames = this.animationFrames();
    if (frames.length === 0) {
      return;
    }

    const frame = Math.min(frames.length, Math.max(1, frameNumber));
    this.currentFrame.set(frame);
    const figures = frames[frame - 1]?.figures ?? [];
    if (!figures.some(({ id }) => id === this.selectedFigureId())) {
      this.selectedFigureId.set(figures[0]?.id ?? null);
    }
  }

  setFps(value: number): void {
    const fps = Math.min(60, Math.max(1, Math.round(value)));
    if (!Number.isFinite(value) || fps === this.fps()) {
      return;
    }

    this.recordHistory();
    this.fps.set(fps);
  }

  undo(): void {
    const history = this.undoStack();
    const previous = history.at(-1);
    if (!previous) {
      return;
    }

    this.redoStack.update((entries) => appendHistory(entries, this.snapshot()));
    this.undoStack.set(history.slice(0, -1));
    this.restore(previous);
  }

  redo(): void {
    const history = this.redoStack();
    const next = history.at(-1);
    if (!next) {
      return;
    }

    this.undoStack.update((entries) => appendHistory(entries, this.snapshot()));
    this.redoStack.set(history.slice(0, -1));
    this.restore(next);
  }

  handleShortcut(event: KeyboardEvent): void {
    if (!(event.metaKey || event.ctrlKey) || event.altKey) {
      return;
    }

    const key = event.key.toLowerCase();
    if ((key === 'z' && event.shiftKey) || key === 'y') {
      event.preventDefault();
      this.redo();
    } else if (key === 'z') {
      event.preventDefault();
      this.undo();
    }
  }

  private readonly undoStack = signal<readonly EditorSnapshot[]>([]);
  private readonly redoStack = signal<readonly EditorSnapshot[]>([]);
  private nextFigureId = 1;
  private pendingEdit: EditorSnapshot | null = null;
  private editRecorded = false;

  private uniqueFigureName(name: string): string {
    const usedNames = new Set(
      this.animationFrames().flatMap(({ figures }) => figures.map(({ figure }) => figure.name)),
    );
    if (!usedNames.has(name)) {
      return name;
    }

    let suffix = 2;
    while (usedNames.has(`${name} ${suffix}`)) {
      suffix += 1;
    }
    return `${name} ${suffix}`;
  }

  private updateBackground(background: SceneBackground): void {
    if (this.animationFrames().length === 0) {
      return;
    }
    this.recordHistory();
    this.animationFrames.update((frames) => frames.map((frame) => ({ ...frame, background })));
  }

  private recordHistory(): void {
    const pendingEdit = this.pendingEdit;
    if (pendingEdit) {
      if (this.editRecorded) {
        return;
      }
      this.undoStack.update((entries) => appendHistory(entries, pendingEdit));
      this.editRecorded = true;
    } else {
      this.undoStack.update((entries) => appendHistory(entries, this.snapshot()));
    }
    this.redoStack.set([]);
  }

  private snapshot(): EditorSnapshot {
    return {
      frames: this.animationFrames(),
      currentFrame: this.currentFrame(),
      selectedFigureId: this.selectedFigureId(),
      fps: this.fps(),
    };
  }

  private restore(snapshot: EditorSnapshot): void {
    this.animationFrames.set(snapshot.frames);
    this.currentFrame.set(snapshot.currentFrame);
    this.selectedFigureId.set(snapshot.selectedFigureId);
    this.fps.set(snapshot.fps);
    this.endFrameEdit();
  }

  private resetHistory(): void {
    this.undoStack.set([]);
    this.redoStack.set([]);
    this.endFrameEdit();
  }
}

function cameraEditorViewBox(camera: SceneCamera): string {
  const width = camera.width * 1.2;
  const height = camera.height * 1.2;
  return `${camera.positionX - width / 2} ${camera.positionY - height / 2} ${width} ${height}`;
}
