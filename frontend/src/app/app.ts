import { ChangeDetectionStrategy, Component, computed, signal } from '@angular/core';
import { parseStickFigureJson, parseStickNodesFile, type StickFigure } from '@framation/engine';
import { EditorToolbar } from './editor-toolbar';
import type { ControlMode } from './editor-types';
import { FigureCanvas } from './figure-canvas';
import { createFigurePreview } from './figure-preview';
import { Inspector } from './inspector';
import { ProjectSidebar } from './project-sidebar';
import { SceneStrip } from './scene-strip';
import { Timeline } from './timeline';

@Component({
  selector: 'app-root',
  imports: [EditorToolbar, FigureCanvas, Inspector, ProjectSidebar, SceneStrip, Timeline],
  templateUrl: './app-shell.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class App {
  protected readonly title = signal('Framation');
  protected readonly animationFrames = signal<readonly StickFigure[]>([]);
  protected readonly importError = signal<string | null>(null);
  protected readonly controlMode = signal<ControlMode>('none');
  protected readonly previewViewBox = signal<string | null>(null);
  protected readonly currentFrame = signal(1);
  protected readonly zoom = signal(100);
  protected readonly importedFigure = computed<StickFigure | null>(() => {
    const frames = this.animationFrames();
    const frameIndex = this.currentFrame() - 1;
    return frameIndex >= 0 && frameIndex < frames.length ? frames[frameIndex]! : null;
  });
  protected readonly preview = computed(() => {
    const figure = this.importedFigure();
    return figure ? createFigurePreview(figure) : null;
  });
  protected readonly framePreviews = computed(() =>
    this.animationFrames().map((figure) => createFigurePreview(figure)),
  );

  protected async importFigure(file: File): Promise<void> {
    try {
      const figure = file.name.toLowerCase().endsWith('.nodes')
        ? parseStickNodesFile(await file.arrayBuffer(), file.name)
        : parseStickFigureJson(await file.text());
      this.animationFrames.set([figure]);
      this.currentFrame.set(1);
      this.importError.set(null);
      this.controlMode.set('none');
      this.previewViewBox.set(createFigurePreview(figure).viewBox);
    } catch (error: unknown) {
      this.animationFrames.set([]);
      this.currentFrame.set(1);
      this.previewViewBox.set(null);
      this.importError.set(
        error instanceof Error ? error.message : 'The figure could not be imported.',
      );
    }
  }

  protected increaseZoom(): void {
    this.zoom.update((value) => (value >= 200 ? 50 : value + 25));
  }

  protected addFrame(): void {
    const figure = this.importedFigure();
    if (!figure) {
      return;
    }

    const insertAt = this.currentFrame();
    this.animationFrames.update((frames) => [
      ...frames.slice(0, insertAt),
      cloneFigure(figure),
      ...frames.slice(insertAt),
    ]);
    this.currentFrame.set(insertAt + 1);
  }

  protected updateCurrentFrame(figure: StickFigure): void {
    const frameIndex = this.currentFrame() - 1;
    this.animationFrames.update((frames) =>
      frames.map((frame, index) => (index === frameIndex ? figure : frame)),
    );
  }
}

function cloneFigure(figure: StickFigure): StickFigure {
  return {
    ...figure,
    joints: figure.joints.map((joint) => ({ ...joint })),
    segments: figure.segments.map((segment) => ({ ...segment })),
  };
}
