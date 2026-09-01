import { Injectable, computed, signal } from '@angular/core';
import type { StickFigure } from '@framation/engine';
import type { EditorSnapshot } from '../domain/editor-history';
import {
  DEFAULT_BACKGROUND,
  type FigureLayer,
  type SceneBackground,
  type SceneFrame,
} from '../domain/scene-frame';
import { createFigurePreview, createScenePreview } from '../rendering/figure-preview';

export const DEFAULT_FPS = 12;

@Injectable({ providedIn: 'root' })
export class EditorDocumentState {
  readonly title = signal('Stickmations');
  readonly projectName = signal('Untitled project');
  readonly animationFrames = signal<readonly SceneFrame[]>([]);
  readonly importError = signal<string | null>(null);
  readonly currentFrame = signal(1);
  readonly fps = signal(DEFAULT_FPS);
  readonly selectedFigureId = signal<string | null>(null);

  readonly currentScene = computed<SceneFrame | null>(() => {
    const frameIndex = this.currentFrame() - 1;
    return this.animationFrames()[frameIndex] ?? null;
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

  snapshot(): EditorSnapshot {
    return {
      frames: this.animationFrames(),
      currentFrame: this.currentFrame(),
      selectedFigureId: this.selectedFigureId(),
      fps: this.fps(),
    };
  }

  restore(snapshot: EditorSnapshot): void {
    this.animationFrames.set(snapshot.frames);
    this.currentFrame.set(snapshot.currentFrame);
    this.selectedFigureId.set(snapshot.selectedFigureId);
    this.fps.set(snapshot.fps);
  }
}
