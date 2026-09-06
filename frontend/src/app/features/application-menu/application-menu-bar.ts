import { NgOptimizedImage } from '@angular/common';
import { ChangeDetectionStrategy, Component, inject, input, output, signal } from '@angular/core';
import {
  LucideBone,
  LucideCamera,
  LucideChevronLeft,
  LucideChevronRight,
  LucideCircleHelp,
  LucideCopyPlus,
  LucideDownload,
  LucideFilePlusCorner,
  LucideHand,
  LucideImage,
  LucideInfo,
  LucideMaximize2,
  LucideNewspaper,
  LucideRedo2,
  LucideSave,
  LucideUndo2,
  LucideUpload,
  LucideX,
  LucideZoomIn,
  LucideZoomOut,
} from '@lucide/angular';
import type { ControlMode, PanOffset } from '../../shared/editor-types';
import { inputNumber } from '../../shared/dom-events';
import { SUPPORT_LINKS } from '../../shared/support-links';
import { EditorOnionStore } from '../../state/editor-onion.store';
import { EditorWorkspaceStore, type WorkspacePanel } from '../../state/editor-workspace.store';
import { ApplicationInfoDialog, type ApplicationInfoView } from './application-info-dialog';

@Component({
  selector: 'app-application-menu-bar',
  imports: [
    ApplicationInfoDialog,
    NgOptimizedImage,
    LucideBone,
    LucideCamera,
    LucideChevronLeft,
    LucideChevronRight,
    LucideCircleHelp,
    LucideCopyPlus,
    LucideDownload,
    LucideFilePlusCorner,
    LucideHand,
    LucideImage,
    LucideInfo,
    LucideMaximize2,
    LucideNewspaper,
    LucideRedo2,
    LucideSave,
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
  protected readonly onion = inject(EditorOnionStore);
  protected readonly links = SUPPORT_LINKS;
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
  readonly figureEditorRequested = output<void>();
  readonly selectedFigureDeleted = output<void>();
  readonly frameAdded = output<void>();
  readonly blankFrameAdded = output<void>();
  readonly frameDeleted = output<void>();
  readonly previousFrame = output<void>();
  readonly nextFrame = output<void>();
  readonly projectSaveRequested = output<void>();
  readonly mp4ExportRequested = output<void>();
  protected readonly informationOpen = signal<ApplicationInfoView | null>(null);

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

  protected toggleOnion(event: Event): void {
    this.onion.setEnabled((event.target as HTMLInputElement).checked);
  }

  protected changeOnionBefore(event: Event): void {
    const value = inputNumber(event);
    if (value !== null) {
      this.onion.setBefore(value);
    }
  }

  protected changeOnionAfter(event: Event): void {
    const value = inputNumber(event);
    if (value !== null) {
      this.onion.setAfter(value);
    }
  }
}
