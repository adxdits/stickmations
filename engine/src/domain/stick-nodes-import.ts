import { BinaryReader, type RecordReader } from './binary-reader.js';
import type {
  FigureFill,
  FigureJoint,
  FigureSegment,
  FigureSegmentShape,
  StickFigure,
} from './figure.js';
import { InvalidStickFigureError } from './validation.js';

const MAX_NODE_COUNT = 4000;
/** Stick Nodes fans out narrowly; a wider count means the record size is wrong. */
const MAX_CHILD_COUNT = 64;
const MIN_FIGURE_SCALE = 0.001;
const MAX_FIGURE_SCALE = 100;

/** Where each field sits inside a node record. Absent fields predate that revision. */
interface NodeOffsets {
  readonly shape: number;
  readonly drawOrder: number;
  readonly isStatic: number;
  readonly isStretchy: number;
  readonly scale: number;
  readonly length: number;
  readonly thickness: number;
  /** Rotation relative to the parent; the absolute rotation that follows it is derived. */
  readonly angle: number;
  /** Node colour first, then the secondary and outline colours later revisions added. */
  readonly colors: readonly number[];
  readonly useSegmentColor?: number;
  readonly useCircleOutline?: number;
  readonly hollow?: number;
  readonly useSegmentScale?: number;
  readonly halfShape?: number;
  readonly triangleDirection?: number;
  readonly triangleUpsideDown?: number;
  readonly trapezoidStart?: number;
  readonly trapezoidEnd?: number;
  readonly polygonSides?: number;
}

interface NodeLayout {
  readonly name: string;
  /** Bytes before the figure scale: 4 when the version stands alone, 8 with a build number. */
  readonly headerBytes: number;
  /** Record bytes preceding the child count. */
  readonly body: number;
  /** Bytes per child entry, holding the connector flag revisions that have one. */
  readonly perChildBytes: number;
  /** Connector nodes repeat part of the parent record ahead of their own. */
  readonly connectorSkip: number;
  readonly hasFills: boolean;
  readonly hasConnectors: boolean;
  /** Lowest file version seen using this record; ordering only, never a gate. */
  readonly since: number;
  readonly offsets: NodeOffsets;
}

/**
 * Stick Nodes grew its node record over time, always by inserting fields rather than moving
 * the ones already there, so every revision keeps the same running order: the offset from the
 * parent, the scale, the length, the thickness, the rotation, and finally the colours.
 *
 * Versions do not announce their record size and the boundaries between revisions are not
 * documented, so `detectLayout` picks the entry that reads a file exactly to its last byte
 * instead of trusting the version number alone. Ordering here only steers that search.
 */
const NODE_LAYOUTS: readonly NodeLayout[] = [
  {
    name: '45-byte record',
    headerBytes: 4,
    body: 45,
    perChildBytes: 0,
    connectorSkip: 0,
    hasFills: false,
    hasConnectors: false,
    since: 170,
    offsets: {
      shape: 0,
      drawOrder: 1,
      isStatic: 5,
      isStretchy: 6,
      useSegmentColor: 7,
      useCircleOutline: 8,
      scale: 17,
      length: 21,
      thickness: 29,
      angle: 37,
      colors: [41],
    },
  },
  {
    name: '51-byte record',
    headerBytes: 4,
    body: 51,
    perChildBytes: 0,
    connectorSkip: 0,
    hasFills: false,
    hasConnectors: false,
    since: 212,
    offsets: {
      shape: 0,
      drawOrder: 1,
      isStatic: 5,
      isStretchy: 6,
      useSegmentColor: 7,
      useCircleOutline: 8,
      hollow: 9,
      scale: 19,
      length: 23,
      thickness: 31,
      angle: 39,
      colors: [43, 47],
    },
  },
  {
    name: '75-byte record',
    headerBytes: 4,
    body: 75,
    perChildBytes: 0,
    connectorSkip: 0,
    hasFills: true,
    hasConnectors: false,
    since: 264,
    offsets: {
      shape: 0,
      drawOrder: 1,
      isStatic: 5,
      isStretchy: 6,
      useSegmentColor: 9,
      useCircleOutline: 10,
      hollow: 11,
      scale: 22,
      length: 26,
      thickness: 34,
      angle: 51,
      colors: [63, 67, 71],
    },
  },
  {
    name: '86-byte record',
    headerBytes: 8,
    body: 86,
    perChildBytes: 0,
    connectorSkip: 0,
    hasFills: true,
    hasConnectors: false,
    since: 417,
    offsets: {
      shape: 0,
      drawOrder: 1,
      isStatic: 5,
      isStretchy: 6,
      useSegmentColor: 9,
      useCircleOutline: 10,
      hollow: 11,
      scale: 25,
      length: 29,
      thickness: 37,
      angle: 62,
      colors: [74, 78, 82],
    },
  },
  {
    name: '122-byte record',
    headerBytes: 8,
    body: 122,
    perChildBytes: 4,
    connectorSkip: 29,
    hasFills: true,
    hasConnectors: true,
    since: 423,
    offsets: {
      shape: 0,
      drawOrder: 1,
      isStatic: 5,
      isStretchy: 6,
      useSegmentColor: 11,
      useCircleOutline: 12,
      hollow: 13,
      useSegmentScale: 18,
      scale: 27,
      length: 35,
      thickness: 43,
      angle: 78,
      colors: [86, 90, 94],
      halfShape: 54,
      triangleDirection: 55,
      triangleUpsideDown: 57,
      trapezoidStart: 58,
      trapezoidEnd: 62,
      polygonSides: 72,
    },
  },
];

interface StickNodesHeader {
  readonly scale: number;
  readonly color: string;
}

interface ParentNode {
  readonly id: string;
  readonly x: number;
  readonly y: number;
  readonly angle: number;
}

interface ParsedNode {
  readonly id: string;
  readonly drawOrder: number;
  readonly shape: FigureSegmentShape;
  readonly hollow: boolean;
  readonly isStatic: boolean;
  readonly isStretchy: boolean;
  readonly length: number;
  readonly angle: number;
  readonly scale: number;
  readonly width: number;
  readonly color: string;
  readonly halfShape: boolean;
  readonly outlineColor?: string;
  readonly triangleType: 'isosceles' | 'right';
  readonly triangleFlipped: boolean;
  readonly triangleUpsideDown: boolean;
  readonly startWidth: number;
  readonly endWidth: number;
  readonly polygonSides: number;
  readonly childConnectors: readonly boolean[];
}

interface ImportState {
  readonly reader: BinaryReader;
  readonly layout: NodeLayout;
  readonly header: StickNodesHeader;
  readonly joints: FigureJoint[];
  readonly segments: FigureSegment[];
  readonly fills: FigureFill[];
  readonly nodeIds: Set<string>;
  nodeCount: number;
}

export function parseStickNodesFile(
  source: ArrayBuffer | Uint8Array,
  fileName: string,
): StickFigure {
  const name = fileName.replace(/\.nodes$/i, '') || 'Imported figure';
  const figure = detectLayout(source, name);
  if (figure) {
    return figure;
  }

  throw new InvalidStickFigureError(describeUnsupported(source));
}

/**
 * Reads the file with each known record layout and keeps the one that lands exactly on the
 * end of the file. A wrong record size drifts within the first node or two and then trips a
 * bounds check, so consuming every byte is a far stronger signal than the version number,
 * whose mapping to record sizes is only partly known.
 */
function detectLayout(
  source: ArrayBuffer | Uint8Array,
  name: string,
): StickFigure | null {
  const version = readVersion(source);
  const ordered = [...NODE_LAYOUTS].sort(
    (a, b) => layoutDistance(a, version) - layoutDistance(b, version),
  );

  for (const layout of ordered) {
    try {
      return parseWithLayout(source, layout, name);
    } catch (error: unknown) {
      if (error instanceof InvalidStickFigureError) {
        continue;
      }
      throw error;
    }
  }
  return null;
}

/** Prefers the newest layout the version could plausibly be using. */
function layoutDistance(layout: NodeLayout, version: number | null): number {
  if (version === null) {
    return NODE_LAYOUTS.length - NODE_LAYOUTS.indexOf(layout);
  }
  return version >= layout.since
    ? version - layout.since
    : (layout.since - version) * 1000;
}

function readVersion(source: ArrayBuffer | Uint8Array): number | null {
  try {
    return new BinaryReader(source).readInt32();
  } catch {
    return null;
  }
}

function parseWithLayout(
  source: ArrayBuffer | Uint8Array,
  layout: NodeLayout,
  name: string,
): StickFigure {
  const reader = new BinaryReader(source);
  reader.skip(layout.headerBytes);

  const scale = reader.readFloat32();
  if (
    !Number.isFinite(scale) ||
    scale < MIN_FIGURE_SCALE ||
    scale > MAX_FIGURE_SCALE
  ) {
    throw new InvalidStickFigureError(
      `Implausible Stick Nodes figure scale: ${scale}.`,
    );
  }

  const state: ImportState = {
    reader,
    layout,
    header: { scale, color: reader.readRecord(4).color(0) },
    joints: [],
    segments: [],
    fills: [],
    nodeIds: new Set(),
    nodeCount: 0,
  };

  readNodeTree(state, null, false);
  if (layout.hasFills) {
    readPolyfills(state);
  }
  if (layout.hasConnectors) {
    readConnectors(state);
  }

  if (!reader.atEnd) {
    throw new InvalidStickFigureError(
      `Trailing data after the ${layout.name} node tree.`,
    );
  }

  return {
    version: 1,
    name,
    joints: state.joints,
    segments: state.segments,
    ...(state.fills.length === 0 ? {} : { fills: state.fills }),
  };
}

function readNodeTree(
  state: ImportState,
  parent: ParentNode | null,
  isConnector: boolean,
): void {
  state.nodeCount += 1;
  if (state.nodeCount > MAX_NODE_COUNT) {
    throw new InvalidStickFigureError(
      `Stick Nodes files cannot exceed ${MAX_NODE_COUNT} nodes.`,
    );
  }

  const node = readNode(state, isConnector);
  if (state.nodeIds.has(node.id)) {
    throw new InvalidStickFigureError(
      `Stick Nodes node id "${node.id}" is duplicated.`,
    );
  }
  state.nodeIds.add(node.id);

  const globalAngle = (parent?.angle ?? 0) + node.angle;
  const length = node.length * node.scale * state.header.scale;
  const radians = (globalAngle * Math.PI) / 180;
  const x = (parent?.x ?? 0) + length * Math.cos(radians);
  const y = (parent?.y ?? 0) + length * Math.sin(radians);

  state.joints.push({
    id: node.id,
    x,
    y,
    radius: Math.max(node.width / 2, 1),
    color: node.color,
    isStatic: node.isStatic,
    isStretchy: node.isStretchy,
  });

  if (parent) {
    state.segments.push({
      id: `segment-${node.id}`,
      from: parent.id,
      to: node.id,
      width: node.width,
      color: node.color,
      shape: node.shape,
      hollow: node.hollow,
      drawOrder: node.drawOrder,
      halfShape: node.halfShape,
      expandShapeByWidth: true,
      ...(node.outlineColor === undefined
        ? {}
        : { outlineColor: node.outlineColor }),
      triangleType: node.triangleType,
      triangleFlipped: node.triangleFlipped,
      triangleUpsideDown: node.triangleUpsideDown,
      startWidth: node.startWidth,
      endWidth: node.endWidth,
      polygonSides: node.polygonSides,
    });
  }

  const current = { id: node.id, x, y, angle: globalAngle };
  for (const childIsConnector of node.childConnectors) {
    readNodeTree(state, current, childIsConnector);
  }
}

function readNode(state: ImportState, isConnector: boolean): ParsedNode {
  const { reader, layout, header } = state;
  const at = layout.offsets;

  if (isConnector) {
    reader.skip(layout.connectorSkip);
  }
  const record = reader.readRecord(layout.body);

  const drawOrder = record.int32(at.drawOrder);
  const scale = requireFinite(record.float32(at.scale));
  const length = requireFinite(record.float32(at.length));
  const angle = requireFinite(record.float32(at.angle));
  const thickness = record.int32(at.thickness);

  const segmentScale = record.flag(at.useSegmentScale) ? scale : 1;
  const widthScale = segmentScale * header.scale;
  const width = Math.max(thickness * widthScale, 1);

  const nodeColor = record.color(at.colors[0] ?? 0);
  const outlineOffset = at.colors[2];
  const outlineColor =
    outlineOffset === undefined ? undefined : record.color(outlineOffset);

  return {
    id: `node-${drawOrder}`,
    drawOrder,
    shape: readNodeShape(record.int8(at.shape)),
    hollow: record.flag(at.hollow),
    isStatic: record.flag(at.isStatic),
    isStretchy: record.flag(at.isStretchy),
    length,
    angle,
    scale: segmentScale,
    width,
    color: record.flag(at.useSegmentColor) ? nodeColor : header.color,
    halfShape: record.flag(at.halfShape),
    ...(record.flag(at.useCircleOutline) && outlineColor !== undefined
      ? { outlineColor }
      : {}),
    ...readShapeOptions(record, at, width, widthScale),
    childConnectors: readChildConnectors(state),
  };
}

/** Triangle, trapezoid and polygon options only exist in the newest record. */
function readShapeOptions(
  record: RecordReader,
  at: NodeOffsets,
  width: number,
  widthScale: number,
): Pick<
  ParsedNode,
  | 'triangleType'
  | 'triangleFlipped'
  | 'triangleUpsideDown'
  | 'startWidth'
  | 'endWidth'
  | 'polygonSides'
> {
  const direction =
    at.triangleDirection === undefined ? 0 : record.int16(at.triangleDirection);
  const sides = at.polygonSides === undefined ? 3 : record.int16(at.polygonSides);
  const taper = (offset: number | undefined): number =>
    offset === undefined
      ? width
      : Math.max(requireFinite(record.float32(offset)) * widthScale, 1);

  return {
    triangleType: direction === 0 ? 'isosceles' : 'right',
    triangleFlipped: direction < 0,
    triangleUpsideDown: record.flag(at.triangleUpsideDown),
    startWidth: taper(at.trapezoidStart),
    endWidth: taper(at.trapezoidEnd),
    polygonSides: Math.max(sides, 3),
  };
}

function readChildConnectors(state: ImportState): readonly boolean[] {
  const childCount = state.reader.readInt32();
  if (childCount < 0 || childCount > MAX_CHILD_COUNT) {
    throw new InvalidStickFigureError(
      `Invalid Stick Nodes child count: ${childCount}.`,
    );
  }

  return Array.from({ length: childCount }, () =>
    state.layout.perChildBytes === 0 ? false : state.reader.readInt32() !== 0,
  );
}

function readPolyfills(state: ImportState): void {
  const fillCount = readBoundedCount(state.reader, 'polyfill');
  for (let index = 0; index < fillCount; index += 1) {
    const drawOrder = state.reader.readInt32();
    const color = state.reader.readRecord(4).color(0);
    const useFillColor = state.reader.readUint8() !== 0;
    const jointCount = readBoundedCount(state.reader, 'polyfill joint');
    const jointIds = Array.from(
      { length: jointCount },
      () => `node-${state.reader.readInt32()}`,
    );
    if (jointIds.length >= 3) {
      state.fills.push({
        id: `fill-${index}`,
        jointIds,
        color: useFillColor ? color : state.header.color,
        drawOrder,
      });
    }
  }
}

function readConnectors(state: ImportState): void {
  const connectorCount = readBoundedCount(state.reader, 'connector');
  for (let index = 0; index < connectorCount; index += 1) {
    state.reader.readInt32();
    state.reader.readInt32();
  }
}

function readBoundedCount(reader: BinaryReader, label: string): number {
  const count = reader.readInt32();
  if (count < 0 || count > MAX_NODE_COUNT) {
    throw new InvalidStickFigureError(
      `Invalid Stick Nodes ${label} count: ${count}.`,
    );
  }
  return count;
}

/** Explains why nothing read the file, rather than repeating the last layout's failure. */
function describeUnsupported(source: ArrayBuffer | Uint8Array): string {
  const bytes = source instanceof Uint8Array ? source : new Uint8Array(source);
  if (bytes[0] === 0x78) {
    return 'This Stick Nodes file is compressed, which is not supported yet.';
  }

  const version = readVersion(source);
  if (version === null) {
    return 'The Stick Nodes file is incomplete or corrupted.';
  }
  return `Unsupported Stick Nodes file layout (version ${version}).`;
}

function readNodeShape(value: number): FigureSegmentShape {
  const shapes: Readonly<Record<number, FigureSegmentShape>> = {
    0: 'rounded-segment',
    1: 'segment',
    2: 'circle',
    3: 'triangle',
    4: 'filled-circle',
    5: 'ellipse',
    6: 'trapezoid',
    7: 'polygon',
  };

  if (value === -1) {
    return 'rounded-segment';
  }
  const shape = shapes[value];
  if (!shape) {
    throw new InvalidStickFigureError(
      `Invalid Stick Nodes segment type: ${value}.`,
    );
  }
  return shape;
}

function requireFinite(value: number): number {
  if (!Number.isFinite(value)) {
    throw new InvalidStickFigureError(
      'The Stick Nodes file contains invalid geometry.',
    );
  }
  return value;
}
