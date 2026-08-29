import { describe, expect, it } from 'vitest';
import type { StickFigure } from './figure.js';
import { moveJointToward } from './kinematics.js';

const figure: StickFigure = {
  version: 1,
  name: 'Rig',
  joints: [
    joint('root', 0, 0),
    joint('shoulder', 10, 0),
    joint('elbow', 20, 0),
    joint('hand', 30, 0),
    joint('decoration', 20, 5, true),
    joint('sibling', -10, 0),
  ],
  segments: [
    segment('root', 'shoulder'),
    segment('shoulder', 'elbow'),
    segment('elbow', 'hand'),
    segment('elbow', 'decoration'),
    segment('root', 'sibling'),
  ],
};

describe('figure kinematics', () => {
  it('rotates a joint branch around its parent', () => {
    const moved = moveJointToward(figure, 'elbow', { x: 10, y: 10 });

    expect(findJoint(moved, 'elbow')).toMatchObject({ x: 10, y: 10 });
    expect(distance(moved, 'elbow', 'decoration')).toBeCloseTo(5);
    expect(findJoint(moved, 'shoulder')).toEqual(findJoint(figure, 'shoulder'));
  });

  it('moves a stretchy joint and its branch without moving siblings', () => {
    const stretchyFigure: StickFigure = {
      ...figure,
      joints: figure.joints.map((value) =>
        value.id === 'elbow' ? { ...value, isStretchy: true } : value,
      ),
    };
    const moved = moveJointToward(stretchyFigure, 'elbow', { x: 15, y: -3 });

    expect(findJoint(moved, 'elbow')).toMatchObject({ x: 15, y: -3 });
    expect(distance(moved, 'elbow', 'hand')).toBeCloseTo(10);
    expect(findJoint(moved, 'shoulder')).toEqual(findJoint(figure, 'shoulder'));
    expect(findJoint(moved, 'sibling')).toEqual(findJoint(figure, 'sibling'));
  });
});

function joint(id: string, x: number, y: number, isStatic = false) {
  return { id, x, y, radius: 1, color: '#000000', isStatic };
}

function segment(from: string, to: string) {
  return { id: `${from}-${to}`, from, to, width: 1, color: '#000000' };
}

function findJoint(value: StickFigure, id: string) {
  const result = value.joints.find((jointValue) => jointValue.id === id);
  if (!result) {
    throw new Error(`Joint ${id} not found.`);
  }
  return result;
}

function distance(value: StickFigure, from: string, to: string): number {
  const start = findJoint(value, from);
  const end = findJoint(value, to);
  return Math.hypot(end.x - start.x, end.y - start.y);
}
