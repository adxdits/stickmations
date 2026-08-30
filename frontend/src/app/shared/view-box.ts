import type { SceneCamera } from '../domain/scene-frame';

export const DEFAULT_VIEW_BOX = '-320 -180 640 360';

export interface ViewBox {
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
}

export function parseViewBox(value: string | null): ViewBox {
  const [x, y, width, height] = (value ?? DEFAULT_VIEW_BOX).split(/\s+/).map(Number);
  if ([x, y, width, height].every(Number.isFinite) && width! > 0 && height! > 0) {
    return { x: x!, y: y!, width: width!, height: height! };
  }
  return { x: -320, y: -180, width: 640, height: 360 };
}

export function cameraViewBox(camera: SceneCamera): string {
  return `${camera.positionX - camera.width / 2} ${camera.positionY - camera.height / 2} ${camera.width} ${camera.height}`;
}

export function cameraEditorViewBox(camera: SceneCamera): string {
  const width = camera.width * 1.2;
  const height = camera.height * 1.2;
  return `${camera.positionX - width / 2} ${camera.positionY - height / 2} ${width} ${height}`;
}

export function cameraEditTransform(camera: SceneCamera): string {
  return `rotate(${camera.rotation} ${camera.positionX} ${camera.positionY})`;
}

export function cameraSceneTransform(camera: SceneCamera): string | null {
  return camera.rotation === 0
    ? null
    : `rotate(${-camera.rotation} ${camera.positionX} ${camera.positionY})`;
}

export function rotatedCameraSize(camera: SceneCamera): Readonly<{
  width: number;
  height: number;
}> {
  const radians = (camera.rotation * Math.PI) / 180;
  return {
    width: Math.abs(camera.width * Math.cos(radians)) + Math.abs(camera.height * Math.sin(radians)),
    height:
      Math.abs(camera.width * Math.sin(radians)) + Math.abs(camera.height * Math.cos(radians)),
  };
}
