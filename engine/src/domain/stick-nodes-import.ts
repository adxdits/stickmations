import { BinaryReader } from './binary-reader.js';
import type {
  FigureJoint,
  FigureSegment,
  FigureSegmentShape,
  StickFigure,
} from './figure.js';
import { InvalidStickFigureError } from './validation.js';

const SUPPORTED_VERSION = 432;
const SUPPORTED_BUILD = 119;
const MAX_NODE_COUNT = 400;

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
  readonly shape: FigureSegmentShape;
  readonly hollow: boolean;
  readonly isStatic: boolean;
  readonly isStretchy: boolean;
  readonly length: number;
  readonly angle: number;
  readonly scale: number;
  readonly width: number;
  readonly color: string;
  readonly childConnectors: readonly boolean[];
}

interface ImportState {
  readonly reader: BinaryReader;
  readonly header: StickNodesHeader;
  readonly joints: FigureJoint[];
  readonly segments: FigureSegment[];
  readonly nodeIds: Set<string>;
  nodeCount: number;
}

export function parseStickNodesFile(
  source: ArrayBuffer | Uint8Array,
  fileName: string,
): StickFigure {
  try {
    const reader = new BinaryReader(source);
    const version = reader.readInt32();
    const build = reader.readInt32();

    if (version !== SUPPORTED_VERSION || build !== SUPPORTED_BUILD) {
      throw new InvalidStickFigureError(
        `Unsupported Stick Nodes version ${version}, build ${build}. Expected version ${SUPPORTED_VERSION}, build ${SUPPORTED_BUILD}.`,
      );
    }

    const header = {
      scale: requireFinite(reader.readFloat32()),
      color: readColor(reader),
    };
    const state: ImportState = {
      reader,
      header,
      joints: [],
      segments: [],
      nodeIds: new Set(),
      nodeCount: 0,
    };

    readNodeTree(state, null, false);

    return {
      version: 1,
      name: fileName.replace(/\.nodes$/i, '') || 'Imported figure',
      joints: state.joints,
      segments: state.segments,
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

  const node = readNode(state.reader, state.header, isConnector);
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
  const id = `node-${reader.readInt32()}`;
  const isStatic = reader.readUint8() !== 0;
  const isStretchy = reader.readUint8() !== 0;
  reader.skip(2);
  reader.skip(2);
  const useSegmentColor = reader.readUint8() !== 0;
  reader.readUint8();
  const hollow = reader.readUint8() !== 0;
  reader.skip(4);
  const useSegmentScale = reader.readUint8() !== 0;
  reader.skip(8);
  const scale = requireFinite(reader.readFloat32());
  reader.skip(4);
  const length = requireFinite(reader.readFloat32());
  reader.skip(4);
  const thickness = reader.readInt32();
  reader.skip(31);
  const angle = requireFinite(reader.readFloat32());
  reader.skip(4);
  const nodeColor = readColor(reader);
  reader.skip(8);
  reader.skip(2);
  reader.skip(12);
  reader.skip(2);
  reader.skip(8);

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

  return {
    id,
    shape,
    hollow,
    isStatic,
    isStretchy,
    length,
    angle,
    scale: segmentScale,
    width: Math.max(thickness * segmentScale * header.scale, 1),
    color: useSegmentColor ? nodeColor : header.color,
    childConnectors,
  };
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

  return shapes[value] ?? 'rounded-segment';
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
