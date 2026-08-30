import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import {
  LucideBone,
  LucideCamera,
  LucideChevronDown,
  LucideChevronLeft,
  LucideChevronRight,
  LucideChevronUp,
  LucideFocus,
  LucideFullscreen,
  LucideHand,
  LucideMaximize2,
  LucideMinimize2,
  LucideMousePointer2,
  LucideRedo2,
  LucideScan,
  LucideUndo2,
  LucideZoomIn,
  LucideZoomOut,
} from '@lucide/angular';
import type { ControlMode, PanOffset } from './editor-types';
import { inputNumber } from './shared/dom-events';

@Component({
  selector: 'app-canvas-toolbar',
  imports: [
    LucideBone,
    LucideCamera,
    LucideChevronDown,
    LucideChevronLeft,
    LucideChevronRight,
    LucideChevronUp,
    LucideFocus,
    LucideFullscreen,
    LucideHand,
    LucideMaximize2,
    LucideMinimize2,
    LucideMousePointer2,
    LucideRedo2,
    LucideScan,
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
  readonly canFitCamera = input(false);
  readonly canvasFocused = input(false);
  readonly fullscreen = input(false);
  readonly zoom = input.required<number>();
  readonly controlModeChange = output<ControlMode>();
  readonly undo = output<void>();
  readonly redo = output<void>();
  readonly zoomIn = output<void>();
  readonly zoomOut = output<void>();
  readonly zoomChange = output<number>();
  readonly fitCanvas = output<void>();
  readonly fitCamera = output<void>();
  readonly canvasFocusToggle = output<void>();
  readonly fullscreenToggle = output<void>();
  readonly panRequested = output<PanOffset>();

  protected changeZoom(event: Event): void {
    const value = inputNumber(event);
    if (value !== null) {
      this.zoomChange.emit(value);
    }
  }
}
