import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { LucideCamera } from '@lucide/angular';
import type { CameraChange, CameraProperty, SceneCamera } from '../../domain/scene-frame';
import { inputNumber } from '../../shared/dom-events';
import type { ControlMode } from '../../shared/editor-types';

@Component({
  selector: 'app-camera-properties',
  imports: [LucideCamera],
  templateUrl: './camera-properties.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CameraProperties {
  readonly camera = input<SceneCamera | null>(null);
  readonly controlMode = input.required<ControlMode>();
  readonly controlModeChange = output<ControlMode>();
  readonly cameraChange = output<CameraChange>();

  protected toggleEditing(): void {
    this.controlModeChange.emit(this.controlMode() === 'camera' ? 'none' : 'camera');
  }

  protected changeCamera(property: CameraProperty, event: Event): void {
    const value = inputNumber(event);
    if (value !== null) {
      this.cameraChange.emit({ property, value });
    }
  }
}
