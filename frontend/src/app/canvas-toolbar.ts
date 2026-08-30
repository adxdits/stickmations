import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import {
  LucideBone,
  LucideCamera,
  LucideChevronLeft,
  LucideChevronRight,
  LucideHand,
  LucideMaximize2,
  LucideMousePointer2,
  LucideRedo2,
  LucideUndo2,
  LucideZoomIn,
  LucideZoomOut,
} from '@lucide/angular';
import type { ControlMode, PanOffset } from './editor-types';

@Component({
  selector: 'app-canvas-toolbar',
  imports: [
    LucideBone,
    LucideCamera,
    LucideChevronLeft,
    LucideChevronRight,
    LucideHand,
    LucideMaximize2,
    LucideMousePointer2,
    LucideRedo2,
    LucideUndo2,
    LucideZoomIn,
    LucideZoomOut,
  ],
  templateUrl: './canvas-toolbar.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CanvasToolbar {
  readonly controlMode = input.required<ControlMode>();
  readonly canUndo = input(false);
  readonly canRedo = input(false);
  readonly controlModeChange = output<ControlMode>();
  readonly undo = output<void>();
  readonly redo = output<void>();
  readonly zoomIn = output<void>();
  readonly zoomOut = output<void>();
  readonly fitCanvas = output<void>();
  readonly panRequested = output<PanOffset>();
}
