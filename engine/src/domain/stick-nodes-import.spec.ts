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

  it('imports files written before build numbers existed', () => {
    const legacy = createLegacyFigure(323);

    const figure = parseStickNodesFile(legacy, 'Legacy.nodes');

    expect(figure.name).toBe('Legacy');
    expect(figure.joints).toHaveLength(2);
    expect(figure.joints[0]).toMatchObject({ id: 'node-0' });
    expect(figure.joints[1]?.x).toBeCloseTo(0);
    expect(figure.joints[1]?.y).toBeCloseTo(100);
    expect(figure.segments).toMatchObject([
      {
        id: 'segment-node-1',
        from: 'node-0',
        to: 'node-1',
        width: 32,
        color: '#ff0000',
      },
    ]);
  });

  it('reads the same legacy layout across the versions that share it', () => {
    for (const version of [200, 323, 334, 431]) {
      const figure = parseStickNodesFile(
        createLegacyFigure(version),
        'Legacy.nodes',
      );
      expect(figure.joints).toHaveLength(2);
    }
  });

  it('defaults the options the legacy layout never stored', () => {
    const figure = parseStickNodesFile(createLegacyFigure(323), 'Legacy.nodes');

    expect(figure.segments[0]).toMatchObject({
      shape: 'rounded-segment',
      halfShape: false,
      triangleType: 'isosceles',
      triangleFlipped: false,
      polygonSides: 3,
    });
  });

  it('rejects versions too old to share the legacy layout', () => {
    expect(() =>
      parseStickNodesFile(createLegacyFigure(120), 'Ancient.nodes'),
    ).toThrow(/Unsupported Stick Nodes version 120/);
  });

  it('still rejects a wrong build number for a current version', () => {
    const wrongBuild = minimalFigure.slice();
    new DataView(wrongBuild.buffer, wrongBuild.byteOffset).setInt32(4, 999);

    expect(() => parseStickNodesFile(wrongBuild, 'Wrong.nodes')).toThrow(
      /Unsupported Stick Nodes build 999/,
    );
  });

  it('rejects truncated files', () => {
    expect(() =>
      parseStickNodesFile(minimalFigure.slice(0, 20), 'Broken.nodes'),
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

/**
 * Builds a two-node file in the pre-build-number layout: no build field, a fixed 84-byte node
 * record, no per-child connector flags, and no trailing connector table.
 */
function createLegacyFigure(version: number): Uint8Array {
  const NODE = 84;
  const header = 12;
  const result = new Uint8Array(header + NODE * 2 + 4);
  const view = new DataView(result.buffer);

  view.setInt32(0, version);
  view.setFloat32(4, 1);
  result.set([0xff, 0x20, 0x20, 0x20], 8); // header colour

  const writeNode = (
    at: number,
    drawOrder: number,
    angle: number,
    length: number,
    childCount: number,
  ) => {
    view.setInt8(at, 0); // rounded segment
    view.setInt32(at + 1, drawOrder);
    result[at + 9] = 1; // use the node's own colour
    result[at + 13] = 1; // use the node's own scale
    view.setFloat32(at + 22, 1); // scale
    view.setFloat32(at + 30, length);
    view.setInt32(at + 38, 32); // thickness
    view.setFloat32(at + 60, angle);
    result.set([0xff, 0x00, 0x00, 0xff], at + 68); // node colour, stored BGRA
    result.set([0xff, 0x80, 0x80, 0x80], at + 72);
    result.set([0xff, 0x80, 0x80, 0x80], at + 76);
    view.setInt32(at + 80, childCount);
  };

  // The root offsets by its own length, so keep it at the origin.
  writeNode(header, 0, 0, 0, 1);
  writeNode(header + NODE, 1, 90, 100, 0);
  view.setInt32(header + NODE * 2, 0); // no polyfills
  return result;
}
