import { Injectable, inject } from '@angular/core';
import type { StickFigure } from '@framation/engine';
import type { FigureOperation, TransformChange } from '../domain/animation-frame';
import { reorderFrames, type EditorSnapshot, type FrameMove } from '../domain/editor-history';
import {
  cloneSceneFrame,
  createSceneFrame,
  type BackgroundChange,
  type CameraChange,
  type LayerMove,
} from '../domain/scene-frame';
import {
  applyCameraChange,
  applyLayerFigureOperation,
  applyLayerTransformChange,
  moveFigureLayer,
  removeFigureLayer,
  setFigureLayerVisibility,
  updateFigureLayer,
} from '../domain/scene-operations';
import { EditorDocumentState } from './editor-document.state';
import { EditorHistoryStore } from './editor-history.store';
import { EditorProjectStore } from './editor-project.store';

@Injectable({ providedIn: 'root' })
export class EditorDocumentStore {
  private readonly document = inject(EditorDocumentState);
  private readonly history = inject(EditorHistoryStore);
  private readonly project = inject(EditorProjectStore);

  readonly title = this.document.title;
  readonly projectName = this.document.projectName;
  readonly animationFrames = this.document.animationFrames;
  readonly importError = this.document.importError;
  readonly currentFrame = this.document.currentFrame;
  readonly fps = this.document.fps;
  readonly selectedFigureId = this.document.selectedFigureId;
  readonly canUndo = this.history.canUndo;
  readonly canRedo = this.history.canRedo;
  readonly currentScene = this.document.currentScene;
  readonly selectedLayer = this.document.selectedLayer;
  readonly importedFigure = this.document.importedFigure;
  readonly currentTransform = this.document.currentTransform;
  readonly preview = this.document.preview;
  readonly selectedPreview = this.document.selectedPreview;
  readonly currentBackground = this.document.currentBackground;
  readonly currentCamera = this.document.currentCamera;
  readonly framePreviews = this.document.framePreviews;
  readonly frameBackgrounds = this.document.frameBackgrounds;
  readonly frameCameras = this.document.frameCameras;

  async importFigure(file: File): Promise<void> {
    await this.project.importFigure(file);
  }

  async importFigures(files: readonly File[]): Promise<void> {
    await this.project.importFigures(files);
  }

  async importProject(file: File): Promise<void> {
    await this.project.importProject(file);
  }

  createBlankProject(): void {
    this.project.createBlankProject();
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
    this.project.setBackgroundColor(color);
  }

  async importBackground(file: File): Promise<void> {
    await this.project.importBackground(file);
  }

  clearBackgroundImage(): void {
    this.project.clearBackgroundImage();
  }

  updateBackgroundTransform(change: BackgroundChange): void {
    this.project.updateBackgroundTransform(change);
  }

  resetBackgroundTransform(): void {
    this.project.resetBackgroundTransform();
  }

  beginFrameEdit(): void {
    this.history.beginEdit(this.snapshot());
  }

  endFrameEdit(): void {
    this.history.endEdit();
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
    const previous = this.history.undo(this.snapshot());
    if (!previous) {
      return;
    }
    this.restore(previous);
  }

  redo(): void {
    const next = this.history.redo(this.snapshot());
    if (!next) {
      return;
    }
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

  private recordHistory(): void {
    this.history.record(this.snapshot());
  }

  private snapshot(): EditorSnapshot {
    return this.document.snapshot();
  }

  private restore(snapshot: EditorSnapshot): void {
    this.document.restore(snapshot);
  }
}
