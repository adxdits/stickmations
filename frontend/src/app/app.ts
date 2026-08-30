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
  protected readonly importedFigure = signal<StickFigure | null>(null);
  protected readonly importError = signal<string | null>(null);
  protected readonly controlMode = signal<ControlMode>('none');
  protected readonly previewViewBox = signal<string | null>(null);
  protected readonly currentFrame = signal(1);
  protected readonly zoom = signal(100);
  protected readonly preview = computed(() => {
    const figure = this.importedFigure();
    return figure ? createFigurePreview(figure) : null;
  });

  protected async importFigure(file: File): Promise<void> {
    try {
      const figure = file.name.toLowerCase().endsWith('.nodes')
        ? parseStickNodesFile(await file.arrayBuffer(), file.name)
        : parseStickFigureJson(await file.text());
      this.importedFigure.set(figure);
      this.importError.set(null);
      this.controlMode.set('none');
      this.previewViewBox.set(createFigurePreview(figure).viewBox);
    } catch (error: unknown) {
      this.importedFigure.set(null);
      this.previewViewBox.set(null);
      this.importError.set(
        error instanceof Error ? error.message : 'The figure could not be imported.',
      );
    }
  }

  protected increaseZoom(): void {
    this.zoom.update((value) => (value >= 200 ? 50 : value + 25));
  }
}
