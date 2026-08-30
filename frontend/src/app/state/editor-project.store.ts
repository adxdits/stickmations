import { Injectable, inject } from '@angular/core';
import {
  DEFAULT_BACKGROUND,
  createFigureLayer,
  createSceneCamera,
  createSceneFrame,
  type BackgroundChange,
  type SceneBackground,
} from '../domain/scene-frame';
import { addFigureLayer } from '../domain/scene-operations';
import { parseFigureFile, readFileAsDataUrl } from '../io/editor-file-import';
import { createFigurePreview } from '../rendering/figure-preview';
import { cameraEditorViewBox } from '../shared/view-box';
import { DEFAULT_FPS, EditorDocumentState } from './editor-document.state';
import { EditorHistoryStore } from './editor-history.store';
import { EditorViewportStore } from './editor-viewport.store';

@Injectable({ providedIn: 'root' })
export class EditorProjectStore {
  private readonly document = inject(EditorDocumentState);
  private readonly history = inject(EditorHistoryStore);
  private readonly viewport = inject(EditorViewportStore);
  private nextFigureId = 1;

  async importFigure(file: File): Promise<void> {
    try {
      const importedFigure = await parseFigureFile(file);
      const figure = {
        ...importedFigure,
        name: this.uniqueFigureName(importedFigure.name),
      };
      const layerId = `figure-${this.nextFigureId++}`;
      if (this.document.animationFrames().length === 0) {
        const figurePreview = createFigurePreview(figure);
        const camera = createSceneCamera(figurePreview.viewBox);
        this.document.animationFrames.set([
          createSceneFrame(createFigureLayer(layerId, figure), camera),
        ]);
        this.viewport.reset(cameraEditorViewBox(camera));
        this.document.currentFrame.set(1);
        this.history.reset();
      } else {
        this.history.record(this.document.snapshot());
        const frameIndex = this.document.currentFrame() - 1;
        this.document.animationFrames.update((frames) =>
          frames.map((frame, index) =>
            index >= frameIndex ? addFigureLayer(frame, createFigureLayer(layerId, figure)) : frame,
          ),
        );
      }
      this.document.selectedFigureId.set(layerId);
      this.document.importError.set(null);
      this.viewport.controlMode.set('none');
    } catch (error: unknown) {
      this.document.importError.set(
        error instanceof Error ? error.message : 'The figure could not be imported.',
      );
    }
  }

  async importFigures(files: readonly File[]): Promise<void> {
    const groupImport = this.document.animationFrames().length > 0;
    if (groupImport) {
      this.history.beginEdit(this.document.snapshot());
    }
    try {
      for (const file of files) {
        await this.importFigure(file);
      }
    } finally {
      if (groupImport) {
        this.history.endEdit();
      }
    }
  }

  createBlankProject(): void {
    const frame = createSceneFrame();
    this.document.animationFrames.set([frame]);
    this.viewport.reset(cameraEditorViewBox(frame.camera));
    this.document.currentFrame.set(1);
    this.document.fps.set(DEFAULT_FPS);
    this.document.selectedFigureId.set(null);
    this.document.importError.set(null);
    this.history.reset();
  }

  setBackgroundColor(color: string): void {
    this.ensureFrame();
    this.updateBackground({ ...this.document.currentBackground(), color });
  }

  async importBackground(file: File): Promise<void> {
    try {
      const imageUrl = await readFileAsDataUrl(file);
      this.ensureFrame();
      this.updateBackground({
        ...this.document.currentBackground(),
        imageUrl,
        imageName: file.name,
      });
      this.document.importError.set(null);
    } catch (error: unknown) {
      this.document.importError.set(
        error instanceof Error ? error.message : 'The background image could not be read.',
      );
    }
  }

  clearBackgroundImage(): void {
    this.updateBackground({
      ...this.document.currentBackground(),
      imageUrl: null,
      imageName: null,
    });
  }

  updateBackgroundTransform(change: BackgroundChange): void {
    this.ensureFrame();
    const background = this.document.currentBackground();
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
    const background = this.document.currentBackground();
    this.updateBackground({
      ...background,
      fit: DEFAULT_BACKGROUND.fit,
      scale: DEFAULT_BACKGROUND.scale,
      positionX: DEFAULT_BACKGROUND.positionX,
      positionY: DEFAULT_BACKGROUND.positionY,
    });
  }

  private ensureFrame(): void {
    if (this.document.animationFrames().length === 0) {
      this.createBlankProject();
    }
  }

  private uniqueFigureName(name: string): string {
    const usedNames = new Set(
      this.document
        .animationFrames()
        .flatMap(({ figures }) => figures.map(({ figure }) => figure.name)),
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
    if (this.document.animationFrames().length === 0) {
      return;
    }
    this.history.record(this.document.snapshot());
    this.document.animationFrames.update((frames) =>
      frames.map((frame) => ({ ...frame, background })),
    );
  }
}
