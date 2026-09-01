import { NgOptimizedImage } from '@angular/common';
import { ChangeDetectionStrategy, Component, inject, input, output, signal } from '@angular/core';
import {
  LucideBone,
  LucideCamera,
  LucideChevronLeft,
  LucideChevronRight,
  LucideCopyPlus,
  LucideDownload,
  LucideFilePlusCorner,
  LucideHand,
  LucideImage,
  LucideInfo,
  LucideMaximize2,
  LucideRedo2,
  LucideSave,
  LucideSettings2,
  LucideUndo2,
  LucideUpload,
  LucideX,
  LucideZoomIn,
  LucideZoomOut,
} from '@lucide/angular';
import type { ControlMode, PanOffset } from '../../shared/editor-types';
import { EditorWorkspaceStore, type WorkspacePanel } from '../../state/editor-workspace.store';

@Component({
  selector: 'app-application-menu-bar',
  imports: [
    NgOptimizedImage,
    LucideBone,
    LucideCamera,
    LucideChevronLeft,
    LucideChevronRight,
    LucideCopyPlus,
    LucideDownload,
    LucideFilePlusCorner,
    LucideHand,
    LucideImage,
    LucideInfo,
    LucideMaximize2,
    LucideRedo2,
    LucideSave,
    LucideSettings2,
    LucideUndo2,
    LucideUpload,
    LucideX,
    LucideZoomIn,
    LucideZoomOut,
  ],
  templateUrl: './application-menu-bar.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ApplicationMenuBar {
  protected readonly workspace = inject(EditorWorkspaceStore);
  readonly title = input.required<string>();
  readonly projectName = input.required<string>();
  readonly controlMode = input.required<ControlMode>();
  readonly zoom = input.required<number>();
  readonly canUndo = input(false);
  readonly canRedo = input(false);
  readonly currentFrame = input.required<number>();
  readonly totalFrames = input.required<number>();
  readonly selectedFigureName = input<string | null>(null);
  readonly canSaveProject = input(false);
  readonly canExportMp4 = input(false);
  readonly controlModeChange = output<ControlMode>();
  readonly undo = output<void>();
  readonly redo = output<void>();
  readonly zoomIn = output<void>();
  readonly zoomOut = output<void>();
  readonly fitCanvas = output<void>();
  readonly panRequested = output<PanOffset>();
  readonly filesSelected = output<readonly File[]>();
  readonly projectFileSelected = output<File>();
  readonly backgroundFileSelected = output<File>();
  readonly blankProjectRequested = output<void>();
  readonly selectedFigureDeleted = output<void>();
  readonly frameAdded = output<void>();
  readonly blankFrameAdded = output<void>();
  readonly frameDeleted = output<void>();
  readonly previousFrame = output<void>();
  readonly nextFrame = output<void>();
  readonly projectSaveRequested = output<void>();
  readonly mp4ExportRequested = output<void>();
  protected readonly aboutOpen = signal(false);

  protected togglePanel(panel: WorkspacePanel, event: Event): void {
    this.workspace.toggle(panel);
    event.stopPropagation();
  }

  protected selectFiles(event: Event): void {
    const input = event.target as HTMLInputElement;
    const files = Array.from(input.files ?? []);
    if (files.length > 0) {
      this.filesSelected.emit(files);
    }
    input.value = '';
    this.closeMenu(event);
  }

  protected selectProject(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (file) {
      this.projectFileSelected.emit(file);
    }
    input.value = '';
    this.closeMenu(event);
  }

  protected selectBackground(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (file) {
      this.backgroundFileSelected.emit(file);
    }
    input.value = '';
    this.closeMenu(event);
  }

  protected closeMenu(event: Event): void {
    (event.currentTarget as HTMLElement).closest('details')?.removeAttribute('open');
  }
}
