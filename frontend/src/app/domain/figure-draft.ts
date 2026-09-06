import type {
  FigureJoint,
  FigureSegment,
  FigureSegmentShape,
  StickFigure,
} from '@stickmations/engine';

/** Shapes the figure editor can draw. The renderer supports more, and imported figures keep theirs. */
export const DRAWABLE_SEGMENT_SHAPES = [
  'rounded-segment',
  'segment',
  'circle',
  'filled-circle',
] as const satisfies readonly FigureSegmentShape[];

export type DrawableSegmentShape = (typeof DRAWABLE_SEGMENT_SHAPES)[number];

export interface DraftPoint {
  readonly x: number;
  readonly y: number;
}

export interface SegmentStyle {
  readonly shape: DrawableSegmentShape;
  readonly width: number;
  readonly color: string;
}

export interface JointStyle {
  readonly radius: number;
  readonly color: string;
}

export const DEFAULT_SEGMENT_STYLE: SegmentStyle = {
  shape: 'rounded-segment',
  width: 8,
  color: '#202020',
};

export const DEFAULT_JOINT_STYLE: JointStyle = {
  radius: 5,
  color: '#202020',
};

export const DEFAULT_FIGURE_NAME = 'Untitled figure';

export function createEmptyFigure(name: string = DEFAULT_FIGURE_NAME): StickFigure {
  return { version: 1, name: figureName(name), joints: [], segments: [] };
}

export function renameFigure(figure: StickFigure, name: string): StickFigure {
  return { ...figure, name: figureName(name) };
}

/**
 * Adds a joint at `point`. When `parentId` names an existing joint the two are connected by a new
 * segment, which is how a limb is drawn one click at a time.
 */
export function addJoint(
  figure: StickFigure,
  point: DraftPoint,
  options: {
    readonly parentId?: string | null;
    readonly joint?: JointStyle;
    readonly segment?: SegmentStyle;
  } = {},
): { readonly figure: StickFigure; readonly jointId: string } {
  const jointStyle = options.joint ?? DEFAULT_JOINT_STYLE;
  const jointId = nextId('joint', figure.joints);
  const joint: FigureJoint = {
    id: jointId,
    x: point.x,
    y: point.y,
    radius: jointStyle.radius,
    color: jointStyle.color,
  };
  const withJoint: StickFigure = { ...figure, joints: [...figure.joints, joint] };
  const parentId = options.parentId ?? null;

  if (parentId === null || !hasJoint(figure, parentId)) {
    return { figure: withJoint, jointId };
  }
  return {
    figure: connectJoints(withJoint, parentId, jointId, options.segment),
    jointId,
  };
}

/** Connects two distinct existing joints. Returns the figure unchanged when that is not possible. */
export function connectJoints(
  figure: StickFigure,
  fromId: string,
  toId: string,
  style: SegmentStyle = DEFAULT_SEGMENT_STYLE,
): StickFigure {
  if (fromId === toId || !hasJoint(figure, fromId) || !hasJoint(figure, toId)) {
    return figure;
  }
  if (figure.segments.some((segment) => connects(segment, fromId, toId))) {
    return figure;
  }

  const segment: FigureSegment = {
    id: nextId('segment', figure.segments),
    from: fromId,
    to: toId,
    width: style.width,
    color: style.color,
    shape: style.shape,
  };
  return { ...figure, segments: [...figure.segments, segment] };
}

export function moveJoint(figure: StickFigure, jointId: string, point: DraftPoint): StickFigure {
  if (!hasJoint(figure, jointId)) {
    return figure;
  }
  return {
    ...figure,
    joints: figure.joints.map((joint) =>
      joint.id === jointId ? { ...joint, x: point.x, y: point.y } : joint,
    ),
  };
}

export function updateJoint(
  figure: StickFigure,
  jointId: string,
  changes: Partial<Pick<FigureJoint, 'x' | 'y' | 'radius' | 'color'>>,
): StickFigure {
  if (!hasJoint(figure, jointId)) {
    return figure;
  }
  return {
    ...figure,
    joints: figure.joints.map((joint) =>
      joint.id === jointId ? { ...joint, ...definedOnly(changes) } : joint,
    ),
  };
}

export function updateSegment(
  figure: StickFigure,
  segmentId: string,
  changes: Partial<Pick<FigureSegment, 'width' | 'color' | 'shape'>>,
): StickFigure {
  if (!figure.segments.some(({ id }) => id === segmentId)) {
    return figure;
  }
  return {
    ...figure,
    segments: figure.segments.map((segment) =>
      segment.id === segmentId ? { ...segment, ...definedOnly(changes) } : segment,
    ),
  };
}

/** Removes a joint along with every segment and fill that referenced it, keeping the figure valid. */
export function deleteJoint(figure: StickFigure, jointId: string): StickFigure {
  if (!hasJoint(figure, jointId)) {
    return figure;
  }

  const fills = (figure.fills ?? []).filter((fill) => !fill.jointIds.includes(jointId));
  return {
    version: 1,
    name: figure.name,
    joints: figure.joints.filter((joint) => joint.id !== jointId),
    segments: figure.segments.filter(
      (segment) => segment.from !== jointId && segment.to !== jointId,
    ),
    ...(fills.length === 0 ? {} : { fills }),
  };
}

export function deleteSegment(figure: StickFigure, segmentId: string): StickFigure {
  return { ...figure, segments: figure.segments.filter((segment) => segment.id !== segmentId) };
}

/** True when the figure satisfies what `parseStickFigure` requires of a saved file. */
export function isSavableFigure(figure: StickFigure): boolean {
  return figure.joints.length > 0 && figure.name.trim().length > 0;
}

function hasJoint(figure: StickFigure, jointId: string): boolean {
  return figure.joints.some(({ id }) => id === jointId);
}

function connects(segment: FigureSegment, fromId: string, toId: string): boolean {
  return (
    (segment.from === fromId && segment.to === toId) ||
    (segment.from === toId && segment.to === fromId)
  );
}

function figureName(name: string): string {
  return name.trim() || DEFAULT_FIGURE_NAME;
}

/**
 * Picks the lowest `prefix-n` that no existing entry uses, so ids stay unique even after deletions
 * and when editing a figure imported with unrelated ids.
 */
function nextId(prefix: string, entries: readonly { readonly id: string }[]): string {
  const taken = new Set(entries.map(({ id }) => id));
  let index = entries.length + 1;
  while (taken.has(`${prefix}-${index}`)) {
    index += 1;
  }
  return `${prefix}-${index}`;
}

function definedOnly<T extends object>(changes: T): Partial<T> {
  return Object.fromEntries(
    Object.entries(changes).filter(([, value]) => value !== undefined),
  ) as Partial<T>;
}
