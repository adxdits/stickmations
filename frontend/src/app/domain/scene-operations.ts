import type { FigureOperation, TransformChange } from './animation-frame';
import { applyFigureOperation, applyTransformChange } from './animation-frame';
import type { CameraChange, FigureLayer, LayerMove, SceneFrame } from './scene-frame';

export function applyCameraChange(frame: SceneFrame, change: CameraChange): SceneFrame {
  const value =
    change.property === 'width' || change.property === 'height'
      ? Math.max(1, change.value)
      : change.value;
  return { ...frame, camera: { ...frame.camera, [change.property]: value } };
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
