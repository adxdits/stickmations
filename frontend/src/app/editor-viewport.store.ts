import { Injectable, signal } from '@angular/core';
import type { ControlMode, PanOffset } from './editor-types';

const DEFAULT_VIEW_BOX = '-320 -180 640 360';

interface SavedCamera {
  readonly controlMode: ControlMode;
  readonly zoom: number;
  readonly pan: PanOffset;
}

@Injectable({ providedIn: 'root' })
export class EditorViewportStore {
  readonly controlMode = signal<ControlMode>('none');
  readonly sceneViewBox = signal(DEFAULT_VIEW_BOX);
  readonly zoom = signal(100);
  readonly pan = signal<PanOffset>({ x: 0, y: 0 });
  readonly isPlaybackPreview = signal(false);

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

  setPlaybackPreview(active: boolean): void {
    if (active && !this.savedCamera) {
      this.savedCamera = {
        controlMode: this.controlMode(),
        zoom: this.zoom(),
        pan: this.pan(),
      };
      this.controlMode.set('none');
      this.fitCanvas();
      this.isPlaybackPreview.set(true);
    } else if (!active && this.savedCamera) {
      this.controlMode.set(this.savedCamera.controlMode);
      this.zoom.set(this.savedCamera.zoom);
      this.pan.set(this.savedCamera.pan);
      this.savedCamera = null;
      this.isPlaybackPreview.set(false);
    }
  }

  reset(viewBox = DEFAULT_VIEW_BOX): void {
    this.savedCamera = null;
    this.isPlaybackPreview.set(false);
    this.sceneViewBox.set(viewBox);
    this.controlMode.set('none');
    this.fitCanvas();
  }

  private savedCamera: SavedCamera | null = null;
}
