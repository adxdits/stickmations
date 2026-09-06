import { parseStickFigureJson, type StickFigure } from '@stickmations/engine';
import { describe, expect, it } from 'vitest';
import {
  addJoint,
  connectJoints,
  createEmptyFigure,
  renameFigure,
  updateSegment,
} from '../domain/figure-draft';
import { figureFileName, serializeFigureFile } from './figure-file';

function drawnFigure(): StickFigure {
  let figure = renameFigure(createEmptyFigure(), 'Runner');
  const hip = addJoint(figure, { x: 0, y: 0 });
  const chest = addJoint(hip.figure, { x: 0, y: 40 }, { parentId: hip.jointId });
  const head = addJoint(chest.figure, { x: 0, y: 70 }, { parentId: chest.jointId });
  figure = updateSegment(head.figure, 'segment-2', { shape: 'filled-circle', width: 24 });
  return connectJoints(figure, hip.jointId, head.jointId, {
    shape: 'segment',
    width: 4,
    color: '#3A7BD5',
  });
}

describe('figure file', () => {
  it('writes a drawn figure that imports again through the engine parser', () => {
    const figure = drawnFigure();

    const restored = parseStickFigureJson(serializeFigureFile(figure));

    expect(restored).toEqual(figure);
  });

  it('keeps every shape and styling property through a round trip', () => {
    const figure: StickFigure = {
      version: 1,
      name: 'Fully styled',
      joints: [
        { id: 'a', x: 0, y: 0, radius: 5, color: '#202020', isStatic: true },
        { id: 'b', x: 10, y: 20, radius: 3, color: '#FF0000', isStretchy: false },
        { id: 'c', x: -10, y: 20, radius: 4, color: '#00FF00' },
      ],
      segments: [
        {
          id: 's1',
          from: 'a',
          to: 'b',
          width: 8,
          color: '#202020',
          shape: 'trapezoid',
          hollow: true,
          drawOrder: 2,
          outlineColor: '#FFFFFF',
          startWidth: 6,
          endWidth: 12,
        },
        {
          id: 's2',
          from: 'a',
          to: 'c',
          width: 5,
          color: '#123456',
          shape: 'triangle',
          triangleType: 'right',
          triangleFlipped: true,
          triangleUpsideDown: false,
          halfShape: true,
          expandShapeByWidth: true,
          polygonSides: 6,
        },
      ],
      fills: [{ id: 'f1', jointIds: ['a', 'b', 'c'], color: '#ABCDEF', drawOrder: 9 }],
    };

    expect(parseStickFigureJson(serializeFigureFile(figure))).toEqual(figure);
  });

  it('omits absent optional properties instead of writing null', () => {
    const figure = drawnFigure();

    const written = JSON.parse(serializeFigureFile(figure)) as Record<string, unknown>;

    expect(written['fills']).toBeUndefined();
    expect(Object.keys((written['joints'] as Record<string, unknown>[])[0]!)).toEqual([
      'id',
      'x',
      'y',
      'radius',
      'color',
    ]);
  });

  it('names files from the figure and replaces characters paths reject', () => {
    expect(figureFileName('Runner')).toBe('Runner.json');
    expect(figureFileName('side/kick: v2')).toBe('side_kick_ v2.json');
    expect(figureFileName('   ')).toBe('Untitled figure.json');
    expect(figureFileName('Runner.json')).toBe('Runner.json');
  });
});
