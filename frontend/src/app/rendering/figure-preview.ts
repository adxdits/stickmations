import type { StickFigure } from '@stickmations/engine';
import type { FigureLayer } from '../domain/scene-frame';
import {
  createFilledPath,
  createSegmentGeometry,
  type GeometryPoint,
  type PreviewDrawable,
} from './figure-geometry';

export interface PreviewJoint {
  readonly id: string;
  readonly x: number;
  readonly y: number;
}

export interface FigurePreview {
  readonly viewBox: string;
  readonly drawables: readonly PreviewDrawable[];
  readonly joints: readonly PreviewJoint[];
  readonly editableJoints: readonly PreviewJoint[];
  readonly center: PreviewJoint;
}

export function createFigurePreview(figure: StickFigure): FigurePreview {
  const jointsById = new Map(figure.joints.map((joint) => [joint.id, joint]));
  const entries: DrawableEntry[] = [];
  const bounds = createBounds();
  let sequence = 0;

  for (const [index, segment] of figure.segments.entries()) {
    const from = jointsById.get(segment.from);
    const to = jointsById.get(segment.to);

    if (!from || !to) {
      throw new Error(`Segment "${segment.id}" references an unknown joint.`);
    }

    for (const geometry of createSegmentGeometry(
      segment,
      { x: from.x, y: -from.y },
      { x: to.x, y: -to.y },
    )) {
      entries.push({
        drawable: geometry.drawable,
        drawOrder: segment.drawOrder ?? index,
        sequence: sequence++,
      });
      includePoints(bounds, geometry.points, geometry.padding);
    }
  }

  for (const [index, fill] of (figure.fills ?? []).entries()) {
    const points = fill.jointIds.map((jointId) => {
      const joint = jointsById.get(jointId);
      if (!joint) {
        throw new Error(`Fill "${fill.id}" references an unknown joint.`);
      }
      return { x: joint.x, y: -joint.y };
    });
    const geometry = createFilledPath(fill.id, points, fill.color);
    entries.push({
      drawable: geometry.drawable,
      drawOrder: fill.drawOrder ?? figure.segments.length + index,
      sequence: sequence++,
    });
    includePoints(bounds, geometry.points, geometry.padding);
  }

  const joints = figure.joints.map((joint) => ({
    id: joint.id,
    x: joint.x,
    y: -joint.y,
  }));
  const hasRigMetadata = figure.joints.some(({ isStatic }) => isStatic !== undefined);
  includePoints(bounds, joints, 0);
  const padding = 20;

  return {
    viewBox: `${bounds.minX - padding} ${bounds.minY - padding} ${Math.max(bounds.maxX - bounds.minX + padding * 2, 1)} ${Math.max(bounds.maxY - bounds.minY + padding * 2, 1)}`,
    drawables: entries
      .sort((left, right) => left.drawOrder - right.drawOrder || left.sequence - right.sequence)
      .map(({ drawable }) => drawable),
    joints,
    editableJoints: hasRigMetadata
      ? joints.filter(({ id }) => !figure.joints.find((joint) => joint.id === id)?.isStatic)
      : joints,
    center: joints[0] ?? { id: '', x: 0, y: 0 },
  };
}

export function createScenePreview(layers: readonly FigureLayer[]): FigurePreview {
  const visibleLayers = layers.filter(({ visible }) => visible);
  if (visibleLayers.length === 0) {
    return {
      viewBox: '-320 -180 640 360',
      drawables: [],
      joints: [],
      editableJoints: [],
      center: { id: '', x: 0, y: 0 },
    };
  }

  const merged: StickFigure = {
    version: 1,
    name: 'Scene',
    joints: visibleLayers.flatMap((layer) =>
      layer.figure.joints.map((joint) => ({ ...joint, id: `${layer.id}:${joint.id}` })),
    ),
    segments: visibleLayers.flatMap((layer, layerIndex) =>
      layer.figure.segments.map((segment, segmentIndex) => ({
        ...segment,
        id: `${layer.id}:${segment.id}`,
        from: `${layer.id}:${segment.from}`,
        to: `${layer.id}:${segment.to}`,
        drawOrder: layerIndex * 1000 + (segment.drawOrder ?? segmentIndex),
      })),
    ),
    fills: visibleLayers.flatMap((layer, layerIndex) =>
      (layer.figure.fills ?? []).map((fill, fillIndex) => ({
        ...fill,
        id: `${layer.id}:${fill.id}`,
        jointIds: fill.jointIds.map((jointId) => `${layer.id}:${jointId}`),
        drawOrder: layerIndex * 1000 + (fill.drawOrder ?? layer.figure.segments.length + fillIndex),
      })),
    ),
  };
  return createFigurePreview(merged);
}

interface DrawableEntry {
  readonly drawable: PreviewDrawable;
  readonly drawOrder: number;
  readonly sequence: number;
}

interface Bounds {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
}

function createBounds(): Bounds {
  return {
    minX: Number.POSITIVE_INFINITY,
    minY: Number.POSITIVE_INFINITY,
    maxX: Number.NEGATIVE_INFINITY,
    maxY: Number.NEGATIVE_INFINITY,
  };
}

function includePoints(bounds: Bounds, points: readonly GeometryPoint[], padding: number): void {
  for (const point of points) {
    bounds.minX = Math.min(bounds.minX, point.x - padding);
    bounds.minY = Math.min(bounds.minY, point.y - padding);
    bounds.maxX = Math.max(bounds.maxX, point.x + padding);
    bounds.maxY = Math.max(bounds.maxY, point.y + padding);
  }
}
