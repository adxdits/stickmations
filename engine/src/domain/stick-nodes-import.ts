import { BinaryReader } from './binary-reader.js';
import type {
  FigureFill,
  FigureJoint,
  FigureSegment,
  FigureSegmentShape,
  StickFigure,
} from './figure.js';
import { InvalidStickFigureError } from './validation.js';

const SUPPORTED_FORMATS = new Map<number, number>([
  [432, 119],
  [433, 120],
]);
/**
 * Files written before build 119 carry no build number and pack each node into a fixed-size record,
 * without the per-child connector flags or the trailing connector table the current format adds.
 * Everything the older layouts omit (triangle and trapezoid options, polygon sides, half shapes)
 * simply did not exist yet, so those fall back to the same defaults a plain segment uses.
 *
 * The two legacy records agree field for field up to the rotation; the later one repeats the
 * rotation before the colours, which makes its record four bytes longer.
 */
const LEGACY_TRAILING_ANGLE_VERSION = 320;
const OLDEST_LEGACY_VERSION = 200;
const MAX_NODE_COUNT = 400;

interface LegacyLayout {
  /** Later legacy files store the rotation twice, once more just before the colours. */
  readonly repeatsAngle: boolean;
}

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
  readonly legacy: LegacyLayout | null;
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
  try {
    const reader = new BinaryReader(source);
    const legacy = readFormat(reader);

    const header = {
      scale: requireFinite(reader.readFloat32()),
      color: readColor(reader),
    };
    const state: ImportState = {
      reader,
      legacy,
      header,
      joints: [],
      segments: [],
      fills: [],
      nodeIds: new Set(),
      nodeCount: 0,
    };

    readNodeTree(state, null, false);
    readPolyfills(state);
    if (!state.legacy) {
      readConnectors(state);
    }

    return {
      version: 1,
      name: fileName.replace(/\.nodes$/i, '') || 'Imported figure',
      joints: state.joints,
      segments: state.segments,
      ...(state.fills.length === 0 ? {} : { fills: state.fills }),
    };
  } catch (error: unknown) {
    if (error instanceof InvalidStickFigureError) {
      throw error;
    }
    throw new InvalidStickFigureError(
      'The Stick Nodes file could not be read.',
    );
  }
}

/** Null for the current format, otherwise the legacy record this file's version uses. */
function readFormat(reader: BinaryReader): LegacyLayout | null {
  const version = reader.readInt32();
  const expectedBuild = SUPPORTED_FORMATS.get(version);

  if (expectedBuild !== undefined) {
    const build = reader.readInt32();
    if (build !== expectedBuild) {
      throw new InvalidStickFigureError(
        `Unsupported Stick Nodes build ${build} for version ${version}. Expected build ${expectedBuild}.`,
      );
    }
    return null;
  }

  const oldestSupported = Math.min(...SUPPORTED_FORMATS.keys());
  if (version >= OLDEST_LEGACY_VERSION && version < oldestSupported) {
    return { repeatsAngle: version >= LEGACY_TRAILING_ANGLE_VERSION };
  }

  throw new InvalidStickFigureError(
    `Unsupported Stick Nodes version ${version}. Expected ${OLDEST_LEGACY_VERSION} to ${oldestSupported} or ${[...SUPPORTED_FORMATS.keys()].join(' or ')}.`,
  );
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

  const node = state.legacy
    ? readLegacyNode(state.reader, state.header, state.legacy)
    : readNode(state.reader, state.header, isConnector);
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

function readNode(
  reader: BinaryReader,
  header: StickNodesHeader,
  isConnector: boolean,
): ParsedNode {
  if (isConnector) {
    reader.skip(29);
  }

  const shape = readNodeShape(reader.readInt8());
  const drawOrder = reader.readInt32();
  const id = `node-${drawOrder}`;
  const isStatic = reader.readUint8() !== 0;
  const isStretchy = reader.readUint8() !== 0;
  reader.readUint8();
  reader.readUint8();
  reader.readUint8();
  reader.readUint8();
  const useSegmentColor = reader.readUint8() !== 0;
  const useCircleOutline = reader.readUint8() !== 0;
  const hollow = reader.readUint8() !== 0;
  reader.readUint8();
  reader.readUint8();
  reader.readInt16();
  const useSegmentScale = reader.readUint8() !== 0;
  reader.readFloat32();
  reader.readFloat32();
  const scale = requireFinite(reader.readFloat32());
  reader.readFloat32();
  const length = requireFinite(reader.readFloat32());
  reader.readInt32();
  const thickness = reader.readInt32();
  reader.readInt32();
  reader.readUint8();
  reader.readInt16();
  const halfShape = reader.readUint8() !== 0;
  const triangleDirection = reader.readInt16();
  const triangleUpsideDown = reader.readUint8() !== 0;
  const trapezoidStart = requireFinite(reader.readFloat32());
  const trapezoidEnd = requireFinite(reader.readFloat32());
  reader.readFloat32();
  reader.readUint8();
  reader.readUint8();
  const polygonSides = reader.readInt16();
  reader.readFloat32();
  const angle = requireFinite(reader.readFloat32());
  reader.readFloat32();
  const nodeColor = readColor(reader);
  readColor(reader);
  const outlineColor = readColor(reader);
  reader.readUint8();
  reader.readUint8();
  reader.readFloat32();
  reader.readFloat32();
  reader.readFloat32();
  reader.readInt8();
  reader.readUint8();
  reader.readFloat32();
  reader.readFloat32();

  const childCount = reader.readInt32();
  if (childCount < 0 || childCount > MAX_NODE_COUNT) {
    throw new InvalidStickFigureError(
      `Invalid Stick Nodes child count: ${childCount}.`,
    );
  }

  const childConnectors = Array.from(
    { length: childCount },
    () => reader.readInt32() !== 0,
  );
  const segmentScale = useSegmentScale ? scale : 1;
  const widthScale = segmentScale * header.scale;

  return {
    id,
    drawOrder,
    shape,
    hollow,
    isStatic,
    isStretchy,
    length,
    angle,
    scale: segmentScale,
    width: Math.max(thickness * widthScale, 1),
    color: useSegmentColor ? nodeColor : header.color,
    halfShape,
    ...(useCircleOutline ? { outlineColor } : {}),
    triangleType: triangleDirection === 0 ? 'isosceles' : 'right',
    triangleFlipped: triangleDirection < 0,
    triangleUpsideDown,
    startWidth: Math.max(trapezoidStart * widthScale, 1),
    endWidth: Math.max(trapezoidEnd * widthScale, 1),
    polygonSides: Math.max(polygonSides, 3),
    childConnectors,
  };
}

function readLegacyNode(
  reader: BinaryReader,
  header: StickNodesHeader,
  layout: LegacyLayout,
): ParsedNode {
  const shape = readNodeShape(reader.readInt8());
  const drawOrder = reader.readInt32();
  const isStatic = reader.readUint8() !== 0;
  const isStretchy = reader.readUint8() !== 0;
  reader.skip(2);
  const useSegmentColor = reader.readUint8() !== 0;
  const useCircleOutline = reader.readUint8() !== 0;
  const hollow = reader.readUint8() !== 0;
  reader.skip(1);
  const useSegmentScale = reader.readUint8() !== 0;
  reader.skip(8);
  const scale = requireFinite(reader.readFloat32());
  reader.skip(4);
  const length = requireFinite(reader.readFloat32());
  reader.skip(4);
  const thickness = reader.readInt32();
  reader.skip(18);
  const angle = requireFinite(reader.readFloat32());
  if (layout.repeatsAngle) {
    reader.skip(4);
  }
  const nodeColor = readColor(reader);
  readColor(reader);
  const outlineColor = readColor(reader);

  const childCount = reader.readInt32();
  if (childCount < 0 || childCount > MAX_NODE_COUNT) {
    throw new InvalidStickFigureError(
      `Invalid Stick Nodes child count: ${childCount}.`,
    );
  }

  const segmentScale = useSegmentScale ? scale : 1;
  const widthScale = segmentScale * header.scale;
  const width = Math.max(thickness * widthScale, 1);

  return {
    id: `node-${drawOrder}`,
    drawOrder,
    shape,
    hollow,
    isStatic,
    isStretchy,
    length,
    angle,
    scale: segmentScale,
    width,
    color: useSegmentColor ? nodeColor : header.color,
    halfShape: false,
    ...(useCircleOutline ? { outlineColor } : {}),
    triangleType: 'isosceles',
    triangleFlipped: false,
    triangleUpsideDown: false,
    startWidth: width,
    endWidth: width,
    polygonSides: 3,
    // Older files have no connector flags, so every child is an ordinary node.
    childConnectors: Array.from({ length: childCount }, () => false),
  };
}

function readPolyfills(state: ImportState): void {
  const fillCount = readBoundedCount(state.reader, 'polyfill');
  for (let index = 0; index < fillCount; index += 1) {
    const drawOrder = state.reader.readInt32();
    const color = readColor(state.reader);
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

function readColor(reader: BinaryReader): string {
  reader.readUint8();
  const blue = reader.readUint8();
  const green = reader.readUint8();
  const red = reader.readUint8();
  return `#${toHex(red)}${toHex(green)}${toHex(blue)}`;
}

function toHex(value: number): string {
  return value.toString(16).padStart(2, '0');
}

function requireFinite(value: number): number {
  if (!Number.isFinite(value)) {
    throw new InvalidStickFigureError(
      'The Stick Nodes file contains invalid geometry.',
    );
  }
  return value;
}
