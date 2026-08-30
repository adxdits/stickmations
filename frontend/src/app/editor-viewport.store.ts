import { Injectable, signal } from '@angular/core';
import type { ControlMode, PanOffset } from './editor-types';

const DEFAULT_VIEW_BOX = '-320 -180 640 360';

@Injectable({ providedIn: 'root' })
export class EditorViewportStore {
  readonly controlMode = signal<ControlMode>('none');
  readonly sceneViewBox = signal(DEFAULT_VIEW_BOX);
  readonly zoom = signal(100);
  readonly pan = signal<PanOffset>({ x: 0, y: 0 });

  increaseZoom(): void {
    this.zoom.update((value) => Math.min(200, value + 25));
  }

  decreaseZoom(): void {
    this.zoom.update((value) => Math.max(25, value - 25));
  }

  panBy(offset: PanOffset): void {
    this.pan.update((value) => ({ x: value.x + offset.x, y: value.y + offset.y }));
  }

  fitCanvas(): void {
    this.zoom.set(100);
    this.pan.set({ x: 0, y: 0 });
  }

  reset(viewBox = DEFAULT_VIEW_BOX): void {
    this.sceneViewBox.set(viewBox);
    this.controlMode.set('none');
    this.fitCanvas();
  }
}
