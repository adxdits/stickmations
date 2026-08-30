import { rotateFigure, scaleFigure, translateFigure, type StickFigure } from '@framation/engine';

export type TransformProperty = 'positionX' | 'positionY' | 'rotation' | 'scaleX' | 'scaleY';

export interface FrameTransform {
  readonly positionX: number;
  readonly positionY: number;
  readonly rotation: number;
  readonly scaleX: number;
  readonly scaleY: number;
}

export interface AnimationFrame {
  readonly figure: StickFigure;
  readonly transform: FrameTransform;
}

export interface TransformChange {
  readonly property: TransformProperty;
  readonly value: number;
}

export function createAnimationFrame(figure: StickFigure): AnimationFrame {
  const root = figure.joints[0];
  return {
    figure,
    transform: {
      positionX: root?.x ?? 0,
      positionY: root?.y ?? 0,
      rotation: 0,
      scaleX: 100,
      scaleY: 100,
    },
  };
}

export function cloneAnimationFrame(frame: AnimationFrame): AnimationFrame {
  return {
    figure: {
      ...frame.figure,
      joints: frame.figure.joints.map((joint) => ({ ...joint })),
      segments: frame.figure.segments.map((segment) => ({ ...segment })),
    },
    transform: { ...frame.transform },
  };
}

export function applyTransformChange(
  frame: AnimationFrame,
  change: TransformChange,
): AnimationFrame {
  const currentValue = frame.transform[change.property];
  const value =
    change.property === 'scaleX' || change.property === 'scaleY'
      ? Math.max(1, change.value)
      : change.value;
  let figure = frame.figure;

  switch (change.property) {
    case 'positionX':
      figure = translateFigure(figure, value - currentValue, 0);
      break;
    case 'positionY':
      figure = translateFigure(figure, 0, value - currentValue);
      break;
    case 'rotation':
      figure = rotateFigure(figure, value - currentValue);
      break;
    case 'scaleX':
      figure = scaleFigure(figure, value / currentValue, 1);
      break;
    case 'scaleY':
      figure = scaleFigure(figure, 1, value / currentValue);
      break;
  }

  return {
    figure,
    transform: { ...frame.transform, [change.property]: value },
  };
}
