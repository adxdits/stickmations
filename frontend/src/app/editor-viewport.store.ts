import { Injectable, signal } from '@angular/core';
import type { ControlMode, PanOffset } from './editor-types';
import type { SceneCamera } from './scene-frame';

const DEFAULT_VIEW_BOX = '-320 -180 640 360';
const MIN_ZOOM = 10;
const MAX_ZOOM = 800;

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
    this.setZoom(this.zoom() + 25);
  }

  decreaseZoom(): void {
    this.setZoom(this.zoom() - 25);
  }

  setZoom(value: number): void {
    if (Number.isFinite(value)) {
      this.zoom.set(Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, Math.round(value))));
    }
  }

  zoomAt(factor: number, anchor: PanOffset | null): void {
    const previousZoom = this.zoom();
    this.setZoom(previousZoom * factor);
    const nextZoom = this.zoom();
    if (!anchor || nextZoom === previousZoom) {
      return;
    }

    const scene = parseViewBox(this.sceneViewBox());
    const sceneCenter = { x: scene.x + scene.width / 2, y: scene.y + scene.height / 2 };
    const visibleCenter = {
      x: sceneCenter.x - this.pan().x,
      y: sceneCenter.y - this.pan().y,
    };
    const ratio = nextZoom / previousZoom;
    const nextCenter = {
      x: anchor.x - (anchor.x - visibleCenter.x) / ratio,
      y: anchor.y - (anchor.y - visibleCenter.y) / ratio,
    };
    this.pan.set({ x: sceneCenter.x - nextCenter.x, y: sceneCenter.y - nextCenter.y });
  }

  panBy(offset: PanOffset): void {
    this.pan.update((value) => ({ x: value.x + offset.x, y: value.y + offset.y }));
  }

  fitCanvas(): void {
    this.zoom.set(100);
    this.pan.set({ x: 0, y: 0 });
  }

  fitCamera(camera: SceneCamera): void {
    const scene = parseViewBox(this.sceneViewBox());
    const radians = (camera.rotation * Math.PI) / 180;
    const rotatedWidth =
      Math.abs(camera.width * Math.cos(radians)) + Math.abs(camera.height * Math.sin(radians));
    const rotatedHeight =
      Math.abs(camera.width * Math.sin(radians)) + Math.abs(camera.height * Math.cos(radians));
    const margin = 1.1;
    this.setZoom(
      Math.min(scene.width / (rotatedWidth * margin), scene.height / (rotatedHeight * margin)) *
        100,
    );
    this.pan.set({
      x: scene.x + scene.width / 2 - camera.positionX,
      y: scene.y + scene.height / 2 - camera.positionY,
    });
  }

  startPlaybackPreview(): void {
    if (this.savedCamera) {
      return;
    }
    this.savedCamera = {
      controlMode: this.controlMode(),
      zoom: this.zoom(),
      pan: this.pan(),
    };
    this.controlMode.set('none');
    this.fitCanvas();
    this.isPlaybackPreview.set(true);
  }

  stopPlaybackPreview(): void {
    if (!this.savedCamera) {
      return;
    }
    this.controlMode.set(this.savedCamera.controlMode);
    this.zoom.set(this.savedCamera.zoom);
    this.pan.set(this.savedCamera.pan);
    this.savedCamera = null;
    this.isPlaybackPreview.set(false);
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

function parseViewBox(value: string): Readonly<{
  x: number;
  y: number;
  width: number;
  height: number;
}> {
  const [x, y, width, height] = value.split(/\s+/).map(Number);
  if ([x, y, width, height].every(Number.isFinite) && width! > 0 && height! > 0) {
    return { x: x!, y: y!, width: width!, height: height! };
  }
  return { x: -320, y: -180, width: 640, height: 360 };
}
