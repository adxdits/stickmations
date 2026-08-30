import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import {
  LucideBone,
  LucideMaximize2,
  LucideMousePointer2,
  LucideRedo2,
  LucideSave,
  LucideSettings2,
  LucideUndo2,
  LucideZoomIn,
} from '@lucide/angular';
import type { ControlMode } from './editor-types';

@Component({
  selector: 'app-editor-toolbar',
  imports: [
    LucideBone,
    LucideMaximize2,
    LucideMousePointer2,
    LucideRedo2,
    LucideSave,
    LucideSettings2,
    LucideUndo2,
    LucideZoomIn,
  ],
  templateUrl: './editor-toolbar.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class EditorToolbar {
  readonly title = input.required<string>();
  readonly projectName = input.required<string>();
  readonly controlMode = input.required<ControlMode>();
  readonly zoom = input.required<number>();
  readonly controlModeChange = output<ControlMode>();
  readonly zoomIn = output<void>();
  readonly fitCanvas = output<void>();
}
