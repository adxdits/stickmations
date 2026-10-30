import { describe, expect, it } from 'vitest';
import { parseStickNodesFile } from './stick-nodes-import.js';

const minimalFigure = decodeBase64(
  'AAABsAAAAHc/gAAAAAAAAP8AAAAAAAAAAAAAAAAAAAAAAQAAAAAAAAAAAD+AAAAAAAAAAAAAAAAAACAAAAAgAAAAAAA' +
    'AAQAAAABCAAAAQYAAAL+AAAAAAAAFAAAAAAAAAAAAAAAA/yAgIP+AgID/gICAAAAAAAAAAAAAAAAAAAABAAAAAAA/gA' +
    'AAAAAAAQAAAAAAAAAAAQAAAAAAAAEAAAAAAAEAtpKrzELIAAA/gAAAQsgAAELIAAAAAAAgAAAAIAAAAAAAAAEAAAAAQ' +
    'gAAAEGAAAC/gAAAAAAABUK0AABCtAAAQrQAAP8AAP//gICA/4CAgAAAQrQAAAAAAAAAAAAAAQAAAAAAP4AAAAAAAAAA' +
    'AAAAAAAAAA==',
);

describe('parseStickNodesFile', () => {
  it('converts a Stick Nodes hierarchy to joints and segments', () => {
    const figure = parseStickNodesFile(minimalFigure, 'Minimal.nodes');

    expect(figure.name).toBe('Minimal');
    expect(figure.joints).toHaveLength(2);
    expect(figure.segments).toMatchObject([
      {
        id: 'segment-node-1',
        from: 'node-0',
        to: 'node-1',
        width: 32,
        color: '#ff0000',
        shape: 'rounded-segment',
        hollow: false,
      },
    ]);
    expect(figure.joints[1]?.x).toBeCloseTo(0);
    expect(figure.joints[1]?.y).toBeCloseTo(100);
    expect(figure.joints[1]).toMatchObject({
      isStatic: false,
      isStretchy: false,
    });
  });

  it('imports current Stick Nodes version 433 build 120 files', () => {
    const currentFigure = minimalFigure.slice();
    const header = new DataView(
      currentFigure.buffer,
      currentFigure.byteOffset,
      currentFigure.byteLength,
    );
    header.setInt32(0, 433);
    header.setInt32(4, 120);

    const figure = parseStickNodesFile(currentFigure, 'Current.nodes');

    expect(figure.name).toBe('Current');
    expect(figure.joints).toHaveLength(2);
    expect(figure.segments).toHaveLength(1);
  });

  it('accumulates nested node angles', () => {
    const nestedFigure = createNestedFigure();

    const figure = parseStickNodesFile(nestedFigure, 'Nested.nodes');

    expect(figure.joints).toHaveLength(3);
    expect(figure.joints[1]?.x).toBeCloseTo(Math.SQRT1_2 * 100);
    expect(figure.joints[1]?.y).toBeCloseTo(Math.SQRT1_2 * 100);
    expect(figure.joints[2]?.x).toBeCloseTo(0);
    expect(figure.joints[2]?.y).toBeCloseTo(Math.SQRT1_2 * 200);
  });

  it('imports files across each supported legacy record layout', () => {
    for (const [version, layout] of [
      [170, '45-byte'],
      [212, '51-byte'],
      [264, '75-byte'],
      [417, '86-byte'],
    ] as const) {
      const figure = parseStickNodesFile(
        createLegacyFigure(version, layout),
        'Legacy.nodes',
      );

      expect(figure.name, layout).toBe('Legacy');
      expect(figure.joints, layout).toHaveLength(2);
      expect(figure.joints[0], layout).toMatchObject({ id: 'node-0' });
      expect(figure.joints[1]?.x, layout).toBeCloseTo(0);
      expect(figure.joints[1]?.y, layout).toBeCloseTo(100);
      expect(figure.segments[0], layout).toMatchObject({
        id: 'segment-node-1',
        from: 'node-0',
        to: 'node-1',
        width: 32,
        color: '#ff0000',
      });
    }
  });

  it('defaults the options the legacy layouts never stored', () => {
    const figure = parseStickNodesFile(
      createLegacyFigure(264, '75-byte'),
      'Legacy.nodes',
    );

    expect(figure.segments[0]).toMatchObject({
      shape: 'rounded-segment',
      halfShape: false,
      triangleType: 'isosceles',
      triangleFlipped: false,
      polygonSides: 3,
    });
  });

  it('rejects compressed Stick Nodes files with a clear message', () => {
    expect(() =>
      parseStickNodesFile(new Uint8Array([0x78, 0x9c, 0x00, 0x00]), 'Zlib.nodes'),
    ).toThrow('This Stick Nodes file is compressed, which is not supported yet.');
  });

  it('rejects unrecognized record layouts', () => {
    expect(() =>
      parseStickNodesFile(minimalFigure.slice(0, 20), 'Broken.nodes'),
    ).toThrow(/Unsupported Stick Nodes file layout \(version 432\)/);
  });

  it('rejects truncated files', () => {
    expect(() =>
      parseStickNodesFile(new Uint8Array([1, 2]), 'Broken.nodes'),
    ).toThrow('The Stick Nodes file is incomplete or corrupted.');
  });
});

function decodeBase64(value: string): Uint8Array {
  return Uint8Array.from(atob(value), (character) => character.charCodeAt(0));
}

function createNestedFigure(): Uint8Array {
  const rootAndChild = minimalFigure.slice();
  const childOffset = 146;
  const angleOffset = 78;
  const childCountOffset = 122;
  const treeEnd = childOffset + childCountOffset + 4;
  const childRecord = rootAndChild.slice(childOffset, treeEnd);
  const result = new Uint8Array(treeEnd + 4 + childRecord.length + 8);
  result.set(rootAndChild.slice(0, treeEnd));
  result.set(childRecord, treeEnd + 4);

  const view = new DataView(result.buffer);
  view.setFloat32(childOffset + angleOffset, 45);
  view.setInt32(childOffset + childCountOffset, 1);

  const grandchildOffset = treeEnd + 4;
  view.setInt32(grandchildOffset + 1, 2);
  view.setFloat32(grandchildOffset + angleOffset, 90);
  return result;
}

type LegacyLayoutKind = '45-byte' | '51-byte' | '75-byte' | '86-byte';

function createLegacyFigure(
  version: number,
  kind: LegacyLayoutKind,
): Uint8Array {
  const specs = {
    '45-byte': {
      header: 12,
      body: 45,
      hasFills: false,
      useColor: 7,
      scale: 17,
      length: 21,
      thickness: 29,
      angle: 37,
      colors: [41],
    },
    '51-byte': {
      header: 12,
      body: 51,
      hasFills: false,
      useColor: 7,
      scale: 19,
      length: 23,
      thickness: 31,
      angle: 39,
      colors: [43, 47],
    },
    '75-byte': {
      header: 12,
      body: 75,
      hasFills: true,
      useColor: 9,
      scale: 22,
      length: 26,
      thickness: 34,
      angle: 51,
      colors: [63, 67, 71],
    },
    '86-byte': {
      header: 16,
      body: 86,
      hasFills: true,
      useColor: 9,
      scale: 25,
      length: 29,
      thickness: 37,
      angle: 62,
      colors: [74, 78, 82],
    },
  }[kind];

  const nodeBytes = specs.body + 4;
  const trailerBytes = specs.hasFills ? 4 : 0;
  const result = new Uint8Array(specs.header + nodeBytes * 2 + trailerBytes);
  const view = new DataView(result.buffer);

  view.setInt32(0, version);
  view.setFloat32(specs.header - 8, 1);
  result.set([0xff, 0x20, 0x20, 0x20], specs.header - 4);

  const writeNode = (
    at: number,
    drawOrder: number,
    angle: number,
    length: number,
    childCount: number,
  ) => {
    view.setInt8(at, 0);
    view.setInt32(at + 1, drawOrder);
    result[at + specs.useColor] = 1;
    view.setFloat32(at + specs.scale, 1);
    view.setFloat32(at + specs.length, length);
    view.setInt32(at + specs.thickness, 32);
    view.setFloat32(at + specs.angle, angle);
    const [primaryColor, ...otherColors] = specs.colors;
    if (primaryColor !== undefined) {
      result.set([0xff, 0x00, 0x00, 0xff], at + primaryColor);
    }
    for (const offset of otherColors) {
      result.set([0xff, 0x80, 0x80, 0x80], at + offset);
    }
    view.setInt32(at + specs.body, childCount);
  };

  writeNode(specs.header, 0, 0, 0, 1);
  writeNode(specs.header + nodeBytes, 1, 90, 100, 0);
  if (specs.hasFills) {
    view.setInt32(specs.header + nodeBytes * 2, 0);
  }
  return result;
}
