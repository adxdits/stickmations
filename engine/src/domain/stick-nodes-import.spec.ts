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
    expect(figure.segments).toEqual([
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

  it('rejects truncated files', () => {
    expect(() =>
      parseStickNodesFile(minimalFigure.slice(0, 20), 'Broken.nodes'),
    ).toThrow('The Stick Nodes file is incomplete or corrupted.');
  });
});

function decodeBase64(value: string): Uint8Array {
  return Uint8Array.from(atob(value), (character) => character.charCodeAt(0));
}
