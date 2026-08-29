import type { StickFigure } from './figure.js';
import {
  InvalidStickFigureError,
  optionalPositiveNumber,
  optionalString,
  requireArray,
  requireFiniteNumber,
  requireNonEmptyString,
  requireRecord,
} from './validation.js';

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
    };
  });

  return { version: 1, name, joints, segments };
}
