import type { StickFigure } from '@framation/engine';
import { cloneAnimationFrame, createAnimationFrame, type AnimationFrame } from './animation-frame';

export interface FigureLayer extends AnimationFrame {
  readonly id: string;
  readonly visible: boolean;
}

export type BackgroundFit = 'cover' | 'contain' | 'fill';

export interface SceneBackground {
  readonly color: string;
  readonly imageUrl: string | null;
  readonly imageName: string | null;
  readonly fit: BackgroundFit;
  readonly scale: number;
  readonly positionX: number;
  readonly positionY: number;
}

export interface SceneCamera {
  readonly positionX: number;
  readonly positionY: number;
  readonly width: number;
  readonly height: number;
  readonly rotation: number;
}

export type CameraProperty = keyof SceneCamera;

export interface CameraChange {
  readonly property: CameraProperty;
  readonly value: number;
}

export type BackgroundChange =
  | Readonly<{ property: 'fit'; value: BackgroundFit }>
  | Readonly<{
      property: 'scale' | 'positionX' | 'positionY';
      value: number;
    }>;

export interface SceneFrame {
  readonly figures: readonly FigureLayer[];
  readonly background: SceneBackground;
  readonly camera: SceneCamera;
}

export interface LayerMove {
  readonly layerId: string;
  readonly toIndex: number;
}

export const DEFAULT_BACKGROUND: SceneBackground = {
  color: '#ffffff',
  imageUrl: null,
  imageName: null,
  fit: 'cover',
  scale: 100,
  positionX: 0,
  positionY: 0,
};

export const DEFAULT_CAMERA: SceneCamera = {
  positionX: 0,
  positionY: 0,
  width: 640,
  height: 360,
  rotation: 0,
};

export function createFigureLayer(id: string, figure: StickFigure): FigureLayer {
  return {
    id,
    visible: true,
    ...createAnimationFrame(figure),
  };
}

export function createSceneFrame(layer?: FigureLayer, camera = DEFAULT_CAMERA): SceneFrame {
  return {
    figures: layer ? [layer] : [],
    background: DEFAULT_BACKGROUND,
    camera,
  };
}

export function createSceneCamera(viewBox: string): SceneCamera {
  const [x, y, width, height] = viewBox.split(/\s+/).map(Number);
  if (![x, y, width, height].every(Number.isFinite) || width! <= 0 || height! <= 0) {
    return DEFAULT_CAMERA;
  }
  return {
    positionX: x! + width! / 2,
    positionY: y! + height! / 2,
    width: width!,
    height: height!,
    rotation: 0,
  };
}

export function cloneSceneFrame(frame: SceneFrame): SceneFrame {
  return {
    figures: frame.figures.map((layer) => ({
      ...cloneAnimationFrame(layer),
      id: layer.id,
      visible: layer.visible,
    })),
    background: { ...frame.background },
    camera: { ...frame.camera },
  };
}
