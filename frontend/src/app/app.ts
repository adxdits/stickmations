import { ChangeDetectionStrategy, Component, computed, signal } from '@angular/core';
import { parseStickFigureJson, parseStickNodesFile, type StickFigure } from '@framation/engine';
import {
  applyTransformChange,
  cloneAnimationFrame,
  createAnimationFrame,
  type AnimationFrame,
  type TransformChange,
} from './animation-frame';
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
  protected readonly animationFrames = signal<readonly AnimationFrame[]>([]);
  protected readonly importError = signal<string | null>(null);
  protected readonly controlMode = signal<ControlMode>('none');
  protected readonly previewViewBox = signal<string | null>(null);
  protected readonly currentFrame = signal(1);
  protected readonly zoom = signal(100);
  protected readonly importedFigure = computed<StickFigure | null>(() => {
    const frames = this.animationFrames();
    const frameIndex = this.currentFrame() - 1;
    return frameIndex >= 0 && frameIndex < frames.length ? frames[frameIndex]!.figure : null;
  });
  protected readonly currentTransform = computed(
    () => this.animationFrames()[this.currentFrame() - 1]?.transform ?? null,
  );
  protected readonly preview = computed(() => {
    const figure = this.importedFigure();
    return figure ? createFigurePreview(figure) : null;
  });
  protected readonly framePreviews = computed(() =>
    this.animationFrames().map(({ figure }) => createFigurePreview(figure)),
  );

  protected async importFigure(file: File): Promise<void> {
    try {
      const figure = file.name.toLowerCase().endsWith('.nodes')
        ? parseStickNodesFile(await file.arrayBuffer(), file.name)
        : parseStickFigureJson(await file.text());
      this.animationFrames.set([createAnimationFrame(figure)]);
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
    const frame = this.animationFrames()[this.currentFrame() - 1];
    if (!frame) {
      return;
    }

    const insertAt = this.currentFrame();
    this.animationFrames.update((frames) => [
      ...frames.slice(0, insertAt),
      cloneAnimationFrame(frame),
      ...frames.slice(insertAt),
    ]);
    this.currentFrame.set(insertAt + 1);
  }

  protected updateCurrentFrame(figure: StickFigure): void {
    const frameIndex = this.currentFrame() - 1;
    this.animationFrames.update((frames) =>
      frames.map((frame, index) => {
        if (index !== frameIndex) {
          return frame;
        }
        const root = figure.joints[0];
        return {
          figure,
          transform: {
            ...frame.transform,
            positionX: root?.x ?? frame.transform.positionX,
            positionY: root?.y ?? frame.transform.positionY,
          },
        };
      }),
    );
  }

  protected updateTransform(change: TransformChange): void {
    const frameIndex = this.currentFrame() - 1;
    this.animationFrames.update((frames) =>
      frames.map((frame, index) =>
        index === frameIndex ? applyTransformChange(frame, change) : frame,
      ),
    );
  }
}
