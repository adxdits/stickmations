import type { StickFigure } from '@framation/engine';

export interface PreviewSegment {
  readonly id: string;
  readonly x1: number;
  readonly y1: number;
  readonly x2: number;
  readonly y2: number;
  readonly width: number;
  readonly color: string;
  readonly rounded: boolean;
}

export interface PreviewCircle {
  readonly id: string;
  readonly cx: number;
  readonly cy: number;
  readonly radius: number;
  readonly color: string;
  readonly hollow: boolean;
  readonly width: number;
}

export interface PreviewJoint {
  readonly id: string;
  readonly x: number;
  readonly y: number;
}

export interface FigurePreview {
  readonly viewBox: string;
  readonly segments: readonly PreviewSegment[];
  readonly circles: readonly PreviewCircle[];
  readonly joints: readonly PreviewJoint[];
  readonly editableJoints: readonly PreviewJoint[];
  readonly center: PreviewJoint;
}

export function createFigurePreview(figure: StickFigure): FigurePreview {
  const jointsById = new Map(figure.joints.map((joint) => [joint.id, joint]));
  const segments: PreviewSegment[] = [];
  const circles: PreviewCircle[] = [];

  for (const segment of figure.segments) {
    const from = jointsById.get(segment.from);
    const to = jointsById.get(segment.to);

    if (!from || !to) {
      throw new Error(`Segment "${segment.id}" references an unknown joint.`);
    }

    if (segment.shape === 'circle' || segment.shape === 'filled-circle') {
      circles.push({
        id: segment.id,
        cx: (from.x + to.x) / 2,
        cy: -(from.y + to.y) / 2,
        radius: Math.hypot(to.x - from.x, to.y - from.y) / 2,
        color: segment.color,
        hollow: segment.hollow ?? segment.shape === 'circle',
        width: segment.width,
      });
      continue;
    }

    segments.push({
      id: segment.id,
      x1: from.x,
      y1: -from.y,
      x2: to.x,
      y2: -to.y,
      width: segment.width,
      color: segment.color,
      rounded: segment.shape !== 'segment',
    });
  }

  const joints = figure.joints.map((joint) => ({
    id: joint.id,
    x: joint.x,
    y: -joint.y,
  }));
  const hasRigMetadata = figure.joints.some(({ isStatic }) => isStatic !== undefined);
  const horizontalBounds = joints.flatMap((joint) => [joint.x]);
  const verticalBounds = joints.flatMap((joint) => [joint.y]);

  for (const circle of circles) {
    horizontalBounds.push(circle.cx - circle.radius, circle.cx + circle.radius);
    verticalBounds.push(circle.cy - circle.radius, circle.cy + circle.radius);
  }

  const minX = Math.min(...horizontalBounds);
  const maxX = Math.max(...horizontalBounds);
  const minY = Math.min(...verticalBounds);
  const maxY = Math.max(...verticalBounds);
  const padding = 20;

  return {
    viewBox: `${minX - padding} ${minY - padding} ${Math.max(maxX - minX + padding * 2, 1)} ${Math.max(maxY - minY + padding * 2, 1)}`,
    segments,
    circles,
    joints,
    editableJoints: hasRigMetadata
      ? joints.filter(({ id }) => !figure.joints.find((joint) => joint.id === id)?.isStatic)
      : joints,
    center: joints[0] ?? { id: '', x: 0, y: 0 },
  };
}
