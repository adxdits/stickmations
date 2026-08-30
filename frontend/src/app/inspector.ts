import { ChangeDetectionStrategy, Component, computed, input, output, signal } from '@angular/core';
import type { StickFigure } from '@framation/engine';
import { LucideFolderOpen, LucidePersonStanding } from '@lucide/angular';
import type { FrameTransform, TransformChange, TransformProperty } from './animation-frame';
import type { ControlMode } from './editor-types';

@Component({
  selector: 'app-inspector',
  imports: [LucideFolderOpen, LucidePersonStanding],
  templateUrl: './inspector.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Inspector {
  readonly figure = input<StickFigure | null>(null);
  readonly transform = input<FrameTransform | null>(null);
  readonly controlMode = input.required<ControlMode>();
  readonly controlModeChange = output<ControlMode>();
  readonly transformChange = output<TransformChange>();
  protected readonly tab = signal<'properties' | 'library'>('properties');
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
}
