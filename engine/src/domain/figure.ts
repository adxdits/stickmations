export interface FigureJoint {
  readonly id: string;
  readonly x: number;
  readonly y: number;
  readonly radius: number;
  readonly color: string;
  readonly isStatic?: boolean;
  readonly isStretchy?: boolean;
}

export type FigureSegmentShape =
  | 'rounded-segment'
  | 'segment'
  | 'circle'
  | 'filled-circle'
  | 'triangle'
  | 'ellipse'
  | 'trapezoid'
  | 'polygon';

export interface FigureSegment {
  readonly id: string;
  readonly from: string;
  readonly to: string;
  readonly width: number;
  readonly color: string;
  readonly shape?: FigureSegmentShape;
  readonly hollow?: boolean;
}

export interface StickFigure {
  readonly version: 1;
  readonly name: string;
  readonly joints: readonly FigureJoint[];
  readonly segments: readonly FigureSegment[];
}
