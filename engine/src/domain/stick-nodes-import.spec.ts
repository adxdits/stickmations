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
