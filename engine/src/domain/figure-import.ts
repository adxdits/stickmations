import type { FigureFill, FigureSegmentShape, StickFigure } from './figure.js';
import {
  InvalidStickFigureError,
  optionalBoolean,
  optionalPositiveNumber,
  optionalString,
  requireArray,
  requireFiniteNumber,
  requireNonEmptyString,
  requireRecord,
} from './validation.js';

const FIGURE_SEGMENT_SHAPES = new Set<FigureSegmentShape>([
  'rounded-segment',
  'segment',
  'circle',
  'filled-circle',
  'triangle',
  'ellipse',
  'trapezoid',
  'polygon',
]);

export function parseStickFigureJson(source: string): StickFigure {
  let value: unknown;

  try {
    value = JSON.parse(source) as unknown;
  } catch {
    throw new InvalidStickFigureError('The selected file is not valid JSON.');
  }

  return parseStickFigure(value);
}

export function parseStickFigure(value: unknown): StickFigure {
  const figure = requireRecord(value, 'The figure must be a JSON object.');

  if (figure['version'] !== 1) {
    throw new InvalidStickFigureError(
      'Only stick-figure format version 1 is supported.',
    );
  }

  const name = requireNonEmptyString(figure['name'], 'Figure name');
  const jointValues = requireArray(figure['joints'], 'joints');
  const segmentValues = requireArray(figure['segments'], 'segments');
  const fillValues =
    figure['fills'] === undefined ? [] : requireArray(figure['fills'], 'fills');

  if (jointValues.length === 0) {
    throw new InvalidStickFigureError(
      'A figure must contain at least one joint.',
    );
  }

  const jointIds = new Set<string>();
  const joints = jointValues.map((jointValue, index) => {
    const joint = requireRecord(
      jointValue,
      `Joint ${index + 1} must be an object.`,
    );
    const id = requireNonEmptyString(joint['id'], `Joint ${index + 1} id`);

    if (jointIds.has(id)) {
      throw new InvalidStickFigureError(`Joint id "${id}" is duplicated.`);
    }

    jointIds.add(id);
    const isStatic = optionalBoolean(
      joint['isStatic'],
      `Joint "${id}" static flag`,
    );
    const isStretchy = optionalBoolean(
      joint['isStretchy'],
      `Joint "${id}" stretchy flag`,
    );
    return {
      id,
      x: requireFiniteNumber(joint['x'], `Joint "${id}" x`),
      y: requireFiniteNumber(joint['y'], `Joint "${id}" y`),
      radius: optionalPositiveNumber(
        joint['radius'],
        5,
        `Joint "${id}" radius`,
      ),
      color: optionalString(joint['color'], '#202020', `Joint "${id}" color`),
      ...(isStatic === undefined ? {} : { isStatic }),
      ...(isStretchy === undefined ? {} : { isStretchy }),
    };
  });

  const segmentIds = new Set<string>();
  const segments = segmentValues.map((segmentValue, index) => {
    const segment = requireRecord(
      segmentValue,
      `Segment ${index + 1} must be an object.`,
    );
    const id = requireNonEmptyString(segment['id'], `Segment ${index + 1} id`);
    const from = requireNonEmptyString(segment['from'], `Segment "${id}" from`);
    const to = requireNonEmptyString(segment['to'], `Segment "${id}" to`);

    if (segmentIds.has(id)) {
      throw new InvalidStickFigureError(`Segment id "${id}" is duplicated.`);
    }
    if (!jointIds.has(from) || !jointIds.has(to)) {
      throw new InvalidStickFigureError(
        `Segment "${id}" references an unknown joint.`,
      );
    }
    if (from === to) {
      throw new InvalidStickFigureError(
        `Segment "${id}" must connect two different joints.`,
      );
    }

    segmentIds.add(id);
    const shape = optionalSegmentShape(
      segment['shape'],
      `Segment "${id}" shape`,
    );
    const hollow = optionalBoolean(
      segment['hollow'],
      `Segment "${id}" hollow flag`,
    );
    const drawOrder = optionalFiniteNumber(
      segment['drawOrder'],
      `Segment "${id}" draw order`,
    );
    const halfShape = optionalBoolean(
      segment['halfShape'],
      `Segment "${id}" half-shape flag`,
    );
    const expandShapeByWidth = optionalBoolean(
      segment['expandShapeByWidth'],
      `Segment "${id}" shape expansion flag`,
    );
    const outlineColor = optionalStringValue(
      segment['outlineColor'],
      `Segment "${id}" outline color`,
    );
    const triangleType = optionalTriangleType(
      segment['triangleType'],
      `Segment "${id}" triangle type`,
    );
    const triangleFlipped = optionalBoolean(
      segment['triangleFlipped'],
      `Segment "${id}" triangle flipped flag`,
    );
    const triangleUpsideDown = optionalBoolean(
      segment['triangleUpsideDown'],
      `Segment "${id}" triangle upside-down flag`,
    );
    const startWidth = optionalPositiveNumberValue(
      segment['startWidth'],
      `Segment "${id}" start width`,
    );
    const endWidth = optionalPositiveNumberValue(
      segment['endWidth'],
      `Segment "${id}" end width`,
    );
    const polygonSides = optionalPolygonSides(
      segment['polygonSides'],
      `Segment "${id}" polygon sides`,
    );
    return {
      id,
      from,
      to,
      width: optionalPositiveNumber(
        segment['width'],
        8,
        `Segment "${id}" width`,
      ),
      color: optionalString(
        segment['color'],
        '#202020',
        `Segment "${id}" color`,
      ),
      ...(shape === undefined ? {} : { shape }),
      ...(hollow === undefined ? {} : { hollow }),
      ...(drawOrder === undefined ? {} : { drawOrder }),
      ...(halfShape === undefined ? {} : { halfShape }),
      ...(expandShapeByWidth === undefined ? {} : { expandShapeByWidth }),
      ...(outlineColor === undefined ? {} : { outlineColor }),
      ...(triangleType === undefined ? {} : { triangleType }),
      ...(triangleFlipped === undefined ? {} : { triangleFlipped }),
      ...(triangleUpsideDown === undefined ? {} : { triangleUpsideDown }),
      ...(startWidth === undefined ? {} : { startWidth }),
      ...(endWidth === undefined ? {} : { endWidth }),
      ...(polygonSides === undefined ? {} : { polygonSides }),
    };
  });

  const fillIds = new Set<string>();
  const fills: FigureFill[] = fillValues.map((fillValue, index) => {
    const fill = requireRecord(
      fillValue,
      `Fill ${index + 1} must be an object.`,
    );
    const id = requireNonEmptyString(fill['id'], `Fill ${index + 1} id`);
    if (fillIds.has(id)) {
      throw new InvalidStickFigureError(`Fill id "${id}" is duplicated.`);
    }
    fillIds.add(id);
    const fillJointValues = requireArray(
      fill['jointIds'],
      `Fill "${id}" joints`,
    );
    if (fillJointValues.length < 3) {
      throw new InvalidStickFigureError(
        `Fill "${id}" must contain at least three joints.`,
      );
    }
    const fillJointIds = fillJointValues.map((jointId, jointIndex) => {
      const value = requireNonEmptyString(
        jointId,
        `Fill "${id}" joint ${jointIndex + 1}`,
      );
      if (!jointIds.has(value)) {
        throw new InvalidStickFigureError(
          `Fill "${id}" references an unknown joint.`,
        );
      }
      return value;
    });
    const drawOrder = optionalFiniteNumber(
      fill['drawOrder'],
      `Fill "${id}" draw order`,
    );
    return {
      id,
      jointIds: fillJointIds,
      color: optionalString(fill['color'], '#202020', `Fill "${id}" color`),
      ...(drawOrder === undefined ? {} : { drawOrder }),
    };
  });

  return {
    version: 1,
    name,
    joints,
    segments,
    ...(fills.length === 0 ? {} : { fills }),
  };
}

function optionalFiniteNumber(
  value: unknown,
  property: string,
): number | undefined {
  return value === undefined ? undefined : requireFiniteNumber(value, property);
}

function optionalPositiveNumberValue(
  value: unknown,
  property: string,
): number | undefined {
  return value === undefined
    ? undefined
    : optionalPositiveNumber(value, 1, property);
}

function optionalStringValue(
  value: unknown,
  property: string,
): string | undefined {
  return value === undefined ? undefined : optionalString(value, '', property);
}

function optionalTriangleType(
  value: unknown,
  property: string,
): 'isosceles' | 'right' | undefined {
  if (value === undefined) {
    return undefined;
  }
  if (value !== 'isosceles' && value !== 'right') {
    throw new InvalidStickFigureError(`${property} is invalid.`);
  }
  return value;
}

function optionalPolygonSides(
  value: unknown,
  property: string,
): number | undefined {
  if (value === undefined) {
    return undefined;
  }
  const sides = requireFiniteNumber(value, property);
  if (!Number.isInteger(sides) || sides < 3 || sides > 64) {
    throw new InvalidStickFigureError(
      `${property} must be an integer from 3 to 64.`,
    );
  }
  return sides;
}

function optionalSegmentShape(
  value: unknown,
  property: string,
): FigureSegmentShape | undefined {
  if (value === undefined) {
    return undefined;
  }
  if (
    typeof value !== 'string' ||
    !FIGURE_SEGMENT_SHAPES.has(value as FigureSegmentShape)
  ) {
    throw new InvalidStickFigureError(`${property} is invalid.`);
  }
  return value as FigureSegmentShape;
}
