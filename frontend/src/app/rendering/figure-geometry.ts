import type { FigureSegment } from '@stickmations/engine';

export interface GeometryPoint {
  readonly x: number;
  readonly y: number;
}

export interface PreviewLine {
  readonly kind: 'line';
  readonly id: string;
  readonly x1: number;
  readonly y1: number;
  readonly x2: number;
  readonly y2: number;
  readonly width: number;
  readonly color: string;
  readonly lineCap: 'round' | 'butt';
}

export interface PreviewCircle {
  readonly kind: 'circle';
  readonly id: string;
  readonly cx: number;
  readonly cy: number;
  readonly radius: number;
  readonly fill: string;
  readonly stroke: string;
  readonly strokeWidth: number;
}

export interface PreviewPath {
  readonly kind: 'path';
  readonly id: string;
  readonly d: string;
  readonly fill: string;
  readonly stroke: string;
  readonly strokeWidth: number;
}

export type PreviewDrawable = PreviewLine | PreviewCircle | PreviewPath;

export interface PreviewGeometry {
  readonly drawable: PreviewDrawable;
  readonly points: readonly GeometryPoint[];
  readonly padding: number;
}

export function createSegmentGeometry(
  segment: FigureSegment,
  start: GeometryPoint,
  end: GeometryPoint,
): readonly PreviewGeometry[] {
  const shape = segment.shape ?? 'rounded-segment';
  const width = segment.width;
  const axis = subtract(end, start);
  const length = magnitude(axis);
  const direction = length === 0 ? { x: 1, y: 0 } : scale(axis, 1 / length);
  const normal = { x: -direction.y, y: direction.x };
  const center = scale(add(start, end), 0.5);

  if (shape === 'rounded-segment' || shape === 'segment') {
    return [
      {
        drawable: {
          kind: 'line',
          id: segment.id,
          x1: start.x,
          y1: start.y,
          x2: end.x,
          y2: end.y,
          width,
          color: segment.color,
          lineCap: shape === 'rounded-segment' ? 'round' : 'butt',
        },
        points: [start, end],
        padding: width / 2,
      },
    ];
  }

  if (shape === 'circle' || shape === 'filled-circle') {
    return createCircleGeometry(segment, start, end, center, axis, length);
  }

  if (shape === 'ellipse') {
    const rotation = Math.atan2(axis.y, axis.x);
    const ellipseCenter = segment.halfShape ? start : center;
    const points = segment.halfShape
      ? [
          ellipseCenter,
          ...arcPoints(ellipseCenter, length, width / 2, rotation, -Math.PI / 2, Math.PI / 2),
        ]
      : arcPoints(ellipseCenter, length / 2, width / 2, rotation, 0, Math.PI * 2);
    return [pathGeometry(segment.id, points, segment.color)];
  }

  if (shape === 'triangle') {
    return [
      pathGeometry(
        segment.id,
        trianglePoints(segment, start, end, direction, normal, center, length),
        segment.color,
      ),
    ];
  }

  if (shape === 'trapezoid') {
    const startWidth = segment.startWidth ?? width;
    const endWidth = segment.endWidth ?? width;
    return [
      pathGeometry(
        segment.id,
        [
          subtract(start, scale(normal, startWidth / 2)),
          add(start, scale(normal, startWidth / 2)),
          add(end, scale(normal, endWidth / 2)),
          subtract(end, scale(normal, endWidth / 2)),
        ],
        segment.color,
      ),
    ];
  }

  const sides = Math.max(segment.polygonSides ?? 5, 3);
  const radius =
    length / 2 + (segment.expandShapeByWidth ? width / 2 : 0);
  const baseAngle = Math.atan2(axis.y, axis.x);
  const points = Array.from({ length: sides }, (_, index) => ({
    x: center.x + radius * Math.cos(baseAngle + (index * Math.PI * 2) / sides),
    y: center.y + radius * Math.sin(baseAngle + (index * Math.PI * 2) / sides),
  }));
  return [pathGeometry(segment.id, points, segment.color)];
}

export function createFilledPath(
  id: string,
  points: readonly GeometryPoint[],
  fill: string,
): PreviewGeometry {
  return pathGeometry(id, points, fill);
}

function createCircleGeometry(
  segment: FigureSegment,
  start: GeometryPoint,
  end: GeometryPoint,
  center: GeometryPoint,
  axis: GeometryPoint,
  length: number,
): readonly PreviewGeometry[] {
  const width = segment.width;
  const shapeExpansion = segment.expandShapeByWidth ? width : 0;
  if (segment.halfShape) {
    const startAngle = Math.atan2(axis.y, axis.x) - Math.PI / 2;
    const points = arcPoints(
      center,
      (length + shapeExpansion) / 2,
      (length + shapeExpansion) / 2,
      0,
      startAngle,
      startAngle + Math.PI,
    );
    return [pathGeometry(segment.id, [center, ...points], segment.color)];
  }

  const outerRadius = Math.max((length + shapeExpansion) / 2, 0.5);
  const innerRadius = Math.max((length - width) / 2, 0);
  const outlineColor = segment.outlineColor;
  if (segment.hollow) {
    return [
      circleGeometry(
        segment.id,
        center,
        Math.max(length / 2, 0.5),
        'none',
        outlineColor ?? segment.color,
        width,
      ),
    ];
  }
  if (segment.shape === 'filled-circle' || outlineColor) {
    const geometries: PreviewGeometry[] = [
      circleGeometry(
        `${segment.id}:outline`,
        center,
        outerRadius,
        outlineColor ?? segment.color,
        'none',
        0,
      ),
    ];
    if (innerRadius > 0) {
      geometries.push(circleGeometry(segment.id, center, innerRadius, segment.color, 'none', 0));
    }
    return geometries;
  }
  return [circleGeometry(segment.id, center, outerRadius, segment.color, 'none', 0)];
}

function trianglePoints(
  segment: FigureSegment,
  start: GeometryPoint,
  end: GeometryPoint,
  direction: GeometryPoint,
  normal: GeometryPoint,
  center: GeometryPoint,
  length: number,
): readonly GeometryPoint[] {
  const orientedNormal = segment.triangleFlipped ? scale(normal, -1) : normal;
  const flipLength = segment.triangleUpsideDown ?? false;
  if (segment.triangleType === 'right') {
    const origin = subtract(
      subtract(center, scale(direction, length / 2)),
      scale(orientedNormal, segment.width / 2),
    );
    const along = add(origin, scale(direction, length));
    const opposite = add(origin, scale(orientedNormal, segment.width));
    const far = add(along, scale(orientedNormal, segment.width));
    return flipLength ? [origin, far, opposite] : [origin, along, far];
  }
  const apex = flipLength ? start : end;
  const base = flipLength ? end : start;
  return [
    apex,
    subtract(base, scale(orientedNormal, segment.width / 2)),
    add(base, scale(orientedNormal, segment.width / 2)),
  ];
}

function pathGeometry(id: string, points: readonly GeometryPoint[], fill: string): PreviewGeometry {
  return {
    drawable: {
      kind: 'path',
      id,
      d: closedPath(points),
      fill,
      stroke: 'none',
      strokeWidth: 0,
    },
    points,
    padding: 0,
  };
}

function circleGeometry(
  id: string,
  center: GeometryPoint,
  radius: number,
  fill: string,
  stroke: string,
  strokeWidth: number,
): PreviewGeometry {
  return {
    drawable: {
      kind: 'circle',
      id,
      cx: center.x,
      cy: center.y,
      radius,
      fill,
      stroke,
      strokeWidth,
    },
    points: [
      { x: center.x - radius, y: center.y - radius },
      { x: center.x + radius, y: center.y + radius },
    ],
    padding: strokeWidth / 2,
  };
}

function arcPoints(
  center: GeometryPoint,
  radiusX: number,
  radiusY: number,
  rotation: number,
  startAngle: number,
  endAngle: number,
): readonly GeometryPoint[] {
  const count = 32;
  const cosine = Math.cos(rotation);
  const sine = Math.sin(rotation);
  return Array.from({ length: count + 1 }, (_, index) => {
    const angle = startAngle + ((endAngle - startAngle) * index) / count;
    const localX = radiusX * Math.cos(angle);
    const localY = radiusY * Math.sin(angle);
    return {
      x: center.x + localX * cosine - localY * sine,
      y: center.y + localX * sine + localY * cosine,
    };
  });
}

function closedPath(points: readonly GeometryPoint[]): string {
  if (points.length === 0) {
    return '';
  }
  return `M ${points.map(({ x, y }) => `${x} ${y}`).join(' L ')} Z`;
}

function add(left: GeometryPoint, right: GeometryPoint): GeometryPoint {
  return { x: left.x + right.x, y: left.y + right.y };
}

function subtract(left: GeometryPoint, right: GeometryPoint): GeometryPoint {
  return { x: left.x - right.x, y: left.y - right.y };
}

function scale(point: GeometryPoint, factor: number): GeometryPoint {
  return { x: point.x * factor, y: point.y * factor };
}

function magnitude(point: GeometryPoint): number {
  return Math.hypot(point.x, point.y);
}
