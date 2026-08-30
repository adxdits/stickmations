import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { ApplicationMenuBar } from './application-menu-bar';
import { CanvasToolbar } from './canvas-toolbar';
import { EditorDocumentStore } from './editor-document.store';
import { EditorViewportStore } from './editor-viewport.store';
import { EditorWorkspaceStore } from './editor-workspace.store';
import { FigureCanvas } from './figure-canvas';
import { Inspector } from './inspector';
import { ProjectSidebar } from './project-sidebar';
import { SceneStrip } from './scene-strip';
import { Timeline } from './timeline';

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
    '(window:keydown)': 'editor.handleShortcut($event)',
  },
})
export class App {
  protected readonly editor = inject(EditorDocumentStore);
  protected readonly viewport = inject(EditorViewportStore);
  protected readonly workspace = inject(EditorWorkspaceStore);
}
