import type { StickFigure } from '@framation/engine';
import {
  applyFigureOperation,
  applyTransformChange,
  cloneAnimationFrame,
  createAnimationFrame,
  type AnimationFrame,
  type FigureOperation,
  type TransformChange,
} from './animation-frame';

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

export type BackgroundChange =
  | Readonly<{ property: 'fit'; value: BackgroundFit }>
  | Readonly<{
      property: 'scale' | 'positionX' | 'positionY';
      value: number;
    }>;

export interface SceneFrame {
  readonly figures: readonly FigureLayer[];
  readonly background: SceneBackground;
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

export function createFigureLayer(id: string, figure: StickFigure): FigureLayer {
  return {
    id,
    visible: true,
    ...createAnimationFrame(figure),
  };
}

export function createSceneFrame(layer?: FigureLayer): SceneFrame {
  return {
    figures: layer ? [layer] : [],
    background: DEFAULT_BACKGROUND,
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
  };
}

export function updateFigureLayer(
  frame: SceneFrame,
  layerId: string,
  update: (layer: FigureLayer) => FigureLayer,
): SceneFrame {
  return {
    ...frame,
    figures: frame.figures.map((layer) => (layer.id === layerId ? update(layer) : layer)),
  };
}

export function applyLayerTransformChange(
  frame: SceneFrame,
  layerId: string,
  change: TransformChange,
): SceneFrame {
  return updateFigureLayer(frame, layerId, (layer) => ({
    ...layer,
    ...applyTransformChange(layer, change),
  }));
}

export function applyLayerFigureOperation(
  frame: SceneFrame,
  layerId: string,
  operation: FigureOperation,
): SceneFrame {
  return updateFigureLayer(frame, layerId, (layer) => ({
    ...layer,
    ...applyFigureOperation(layer, operation),
  }));
}

export function addFigureLayer(frame: SceneFrame, layer: FigureLayer): SceneFrame {
  return { ...frame, figures: [...frame.figures, layer] };
}

export function removeFigureLayer(frame: SceneFrame, layerId: string): SceneFrame {
  return { ...frame, figures: frame.figures.filter(({ id }) => id !== layerId) };
}

export function setFigureLayerVisibility(
  frame: SceneFrame,
  layerId: string,
  visible: boolean,
): SceneFrame {
  return updateFigureLayer(frame, layerId, (layer) => ({ ...layer, visible }));
}

export function moveFigureLayer(frame: SceneFrame, move: LayerMove): SceneFrame {
  const fromIndex = frame.figures.findIndex(({ id }) => id === move.layerId);
  const toIndex = Math.min(frame.figures.length - 1, Math.max(0, move.toIndex));
  if (fromIndex < 0 || fromIndex === toIndex) {
    return frame;
  }

  const figures = [...frame.figures];
  const [layer] = figures.splice(fromIndex, 1);
  if (!layer) {
    return frame;
  }
  figures.splice(toIndex, 0, layer);
  return { ...frame, figures };
}
