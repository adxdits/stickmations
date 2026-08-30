import { ChangeDetectionStrategy, Component, computed, input, output, signal } from '@angular/core';
import type { StickFigure } from '@framation/engine';
import {
  LucideCamera,
  LucideFlipHorizontal2,
  LucideFlipVertical2,
  LucideFolderOpen,
  LucidePersonStanding,
  LucideRotateCcw,
  LucideRotateCw,
  LucideX,
} from '@lucide/angular';
import type {
  FigureOperation,
  FrameTransform,
  TransformChange,
  TransformProperty,
} from './animation-frame';
import type { ControlMode } from './editor-types';
import type {
  BackgroundChange,
  BackgroundFit,
  CameraChange,
  CameraProperty,
  SceneBackground,
  SceneCamera,
} from './scene-frame';

@Component({
  selector: 'app-inspector',
  imports: [
    LucideFlipHorizontal2,
    LucideFlipVertical2,
    LucideCamera,
    LucideFolderOpen,
    LucidePersonStanding,
    LucideRotateCcw,
    LucideRotateCw,
    LucideX,
  ],
  templateUrl: './inspector.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Inspector {
  readonly figure = input<StickFigure | null>(null);
  readonly transform = input<FrameTransform | null>(null);
  readonly background = input<SceneBackground | null>(null);
  readonly camera = input<SceneCamera | null>(null);
  readonly controlMode = input.required<ControlMode>();
  readonly controlModeChange = output<ControlMode>();
  readonly transformChange = output<TransformChange>();
  readonly figureOperation = output<FigureOperation>();
  readonly backgroundColorChange = output<string>();
  readonly backgroundChange = output<BackgroundChange>();
  readonly backgroundReset = output<void>();
  readonly backgroundImageRemoved = output<void>();
  readonly cameraChange = output<CameraChange>();
  protected readonly tab = signal<'properties' | 'library'>('properties');
  protected readonly uniformScale = computed(() => {
    const transform = this.transform();
    if (!transform) {
      return 100;
    }
    return transform.scaleX === transform.scaleY ? transform.scaleX : '';
  });
  protected readonly rootPosition = computed(() => {
    const root = this.figure()?.joints[0];
    return { x: Math.round(root?.x ?? 0), y: Math.round(root?.y ?? 0) };
  });
  protected toggleControls(): void {
    this.controlModeChange.emit(this.controlMode() === 'joints' ? 'none' : 'joints');
  }

  protected changeTransform(property: TransformProperty, event: Event): void {
    const value = Number((event.target as HTMLInputElement).value);
    if (Number.isFinite(value)) {
      this.transformChange.emit({ property, value });
    }
  }

  protected changeBackgroundColor(event: Event): void {
    this.backgroundColorChange.emit((event.target as HTMLInputElement).value);
  }

  protected changeCamera(property: CameraProperty, event: Event): void {
    const value = Number((event.target as HTMLInputElement).value);
    if (Number.isFinite(value)) {
      this.cameraChange.emit({ property, value });
    }
  }

  protected changeBackgroundFit(event: Event): void {
    this.backgroundChange.emit({
      property: 'fit',
      value: (event.target as HTMLSelectElement).value as BackgroundFit,
    });
  }

  protected changeBackgroundNumber(
    property: 'scale' | 'positionX' | 'positionY',
    event: Event,
  ): void {
    const value = Number((event.target as HTMLInputElement).value);
    if (Number.isFinite(value)) {
      this.backgroundChange.emit({ property, value });
    }
  }
}
