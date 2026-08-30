import { DOCUMENT } from '@angular/common';
import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { ApplicationMenuBar } from './features/application-menu/application-menu-bar';
import { CanvasToolbar } from './features/canvas/canvas-toolbar';
import { FigureCanvas } from './features/canvas/figure-canvas';
import { Inspector } from './features/inspector/inspector';
import { ProjectSidebar } from './features/project/project-sidebar';
import { SceneStrip } from './features/scene-strip/scene-strip';
import { Timeline } from './features/timeline/timeline';
import { isEditableTarget } from './shared/dom-events';
import { EditorDocumentStore } from './state/editor-document.store';
import { EditorViewportStore } from './state/editor-viewport.store';
import { EditorWorkspaceStore } from './state/editor-workspace.store';

@Component({
  selector: 'app-root',
  imports: [
    ApplicationMenuBar,
    CanvasToolbar,
    FigureCanvas,
    Inspector,
    ProjectSidebar,
    SceneStrip,
    Timeline,
  ],
  templateUrl: './app-shell.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    '(window:keydown)': 'handleShortcut($event)',
    '(document:fullscreenchange)': 'syncFullscreen()',
  },
})
export class App {
  private readonly document = inject(DOCUMENT);
  protected readonly editor = inject(EditorDocumentStore);
  protected readonly viewport = inject(EditorViewportStore);
  protected readonly workspace = inject(EditorWorkspaceStore);
  protected readonly fullscreen = signal(false);

  protected fitCurrentCamera(): void {
    const camera = this.editor.currentCamera();
    if (camera) {
      this.viewport.fitCamera(camera);
    }
  }

  protected toggleFullscreen(): void {
    const fullscreenAction = this.document.fullscreenElement
      ? this.document.exitFullscreen()
      : this.document.documentElement.requestFullscreen();
    void fullscreenAction.catch(() => undefined);
  }

  protected syncFullscreen(): void {
    this.fullscreen.set(Boolean(this.document.fullscreenElement));
  }

  protected handleShortcut(event: KeyboardEvent): void {
    this.editor.handleShortcut(event);
    if (
      event.defaultPrevented ||
      event.metaKey ||
      event.ctrlKey ||
      event.altKey ||
      isEditableTarget(event.target)
    ) {
      return;
    }

    switch (event.key.toLowerCase()) {
      case 'f':
        event.preventDefault();
        this.workspace.toggleCanvasFocus();
        break;
      case '0':
        event.preventDefault();
        this.viewport.fitCanvas();
        break;
      case '+':
      case '=':
        event.preventDefault();
        this.viewport.increaseZoom();
        break;
      case '-':
        event.preventDefault();
        this.viewport.decreaseZoom();
        break;
    }
  }
}
