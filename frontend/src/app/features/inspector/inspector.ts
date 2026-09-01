import { ChangeDetectionStrategy, Component, computed, input, output, signal } from '@angular/core';
import {
  LucideFlipHorizontal2,
  LucideFlipVertical2,
  LucideFolderOpen,
  LucidePersonStanding,
  LucideRotateCcw,
  LucideRotateCw,
} from '@lucide/angular';
import type { StickFigure } from '@stickmations/engine';
import type {
  FigureOperation,
  FrameTransform,
  TransformChange,
  TransformProperty,
} from '../../domain/animation-frame';
import type {
  BackgroundChange,
  CameraChange,
  SceneBackground,
  SceneCamera,
} from '../../domain/scene-frame';
import { inputNumber } from '../../shared/dom-events';
import type { ControlMode } from '../../shared/editor-types';
import { BackgroundProperties } from './background-properties';
import { CameraProperties } from './camera-properties';

@Component({
  selector: 'app-inspector',
  imports: [
    BackgroundProperties,
    CameraProperties,
    LucideFlipHorizontal2,
    LucideFlipVertical2,
    LucideFolderOpen,
    LucidePersonStanding,
    LucideRotateCcw,
    LucideRotateCw,
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
    const value = inputNumber(event);
    if (value !== null) {
      this.transformChange.emit({ property, value });
    }
  }
}
