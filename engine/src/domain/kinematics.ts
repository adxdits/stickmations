import type { FigureJoint, StickFigure } from './figure.js';

interface FigurePoint {
  readonly x: number;
  readonly y: number;
}

export function translateFigure(
  figure: StickFigure,
  deltaX: number,
  deltaY: number,
): StickFigure {
  return translateJoints(
    figure,
    new Set(figure.joints.map(({ id }) => id)),
    deltaX,
    deltaY,
  );
}

function translateJointBranch(
  figure: StickFigure,
  jointId: string,
  deltaX: number,
  deltaY: number,
): StickFigure {
  return translateJoints(
    figure,
    getDescendantIds(figure, jointId),
    deltaX,
    deltaY,
  );
}

export function moveJointToward(
  figure: StickFigure,
  jointId: string,
  target: FigurePoint,
): StickFigure {
  const jointsById = getJointsById(figure);
  const joint = jointsById.get(jointId);
  const parentId = getParentById(figure).get(jointId);
  const parent = parentId ? jointsById.get(parentId) : undefined;

  if (!joint) {
    return figure;
  }
  if (!parent) {
    return translateFigure(figure, target.x - joint.x, target.y - joint.y);
  }

  const currentAngle = Math.atan2(joint.y - parent.y, joint.x - parent.x);
  const targetAngle = Math.atan2(target.y - parent.y, target.x - parent.x);
  let moved = rotateJointBranch(
    figure,
    jointId,
    parent,
    targetAngle - currentAngle,
  );

  if (joint.isStretchy) {
    const rotatedJoint = getJointsById(moved).get(jointId);
    if (rotatedJoint) {
      moved = translateJointBranch(
        moved,
        jointId,
        target.x - rotatedJoint.x,
        target.y - rotatedJoint.y,
      );
    }
  }

  return moved;
}

function rotateJointBranch(
  figure: StickFigure,
  jointId: string,
  pivot: FigurePoint,
  angle: number,
): StickFigure {
  const jointIds = getDescendantIds(figure, jointId);
  const cosine = Math.cos(angle);
  const sine = Math.sin(angle);

  return {
    ...figure,
    joints: figure.joints.map((joint) => {
      if (!jointIds.has(joint.id)) {
        return joint;
      }

      const offsetX = joint.x - pivot.x;
      const offsetY = joint.y - pivot.y;
      return {
        ...joint,
        x: pivot.x + offsetX * cosine - offsetY * sine,
        y: pivot.y + offsetX * sine + offsetY * cosine,
      };
    }),
  };
}

function translateJoints(
  figure: StickFigure,
  jointIds: ReadonlySet<string>,
  deltaX: number,
  deltaY: number,
): StickFigure {
  return {
    ...figure,
    joints: figure.joints.map((joint) =>
      jointIds.has(joint.id)
        ? {
            ...joint,
            x: joint.x + deltaX,
            y: joint.y + deltaY,
          }
        : joint,
    ),
  };
}

function getJointsById(figure: StickFigure): ReadonlyMap<string, FigureJoint> {
  return new Map(figure.joints.map((joint) => [joint.id, joint]));
}

function getParentById(figure: StickFigure): ReadonlyMap<string, string> {
  return new Map(figure.segments.map(({ from, to }) => [to, from]));
}

function getChildrenById(
  figure: StickFigure,
): ReadonlyMap<string, readonly string[]> {
  const childrenById = new Map<string, string[]>();
  for (const { from, to } of figure.segments) {
    const children = childrenById.get(from) ?? [];
    children.push(to);
    childrenById.set(from, children);
  }
  return childrenById;
}

function getDescendantIds(
  figure: StickFigure,
  jointId: string,
): ReadonlySet<string> {
  const childrenById = getChildrenById(figure);
  const descendantIds = new Set([jointId]);
  const pending = [jointId];

  while (pending.length > 0) {
    const parentId = pending.pop();
    for (const childId of parentId ? (childrenById.get(parentId) ?? []) : []) {
      if (!descendantIds.has(childId)) {
        descendantIds.add(childId);
        pending.push(childId);
      }
    }
  }

  return descendantIds;
}
