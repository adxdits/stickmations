import { describe, expect, it } from 'vitest';
import { parseStickFigureJson } from './figure-import.js';
import { InvalidStickFigureError } from './validation.js';

const validFigure = {
  version: 1,
  name: 'Walker',
  joints: [
    { id: 'hip', x: 100, y: 100 },
    { id: 'knee', x: 120, y: 160 },
  ],
  segments: [{ id: 'leg', from: 'hip', to: 'knee' }],
};

describe('parseStickFigureJson', () => {
  it('parses a figure and supplies segment defaults', () => {
    const figure = parseStickFigureJson(JSON.stringify(validFigure));

    expect(figure).toEqual({
      ...validFigure,
      joints: [
        { id: 'hip', x: 100, y: 100, radius: 5, color: '#202020' },
        { id: 'knee', x: 120, y: 160, radius: 5, color: '#202020' },
      ],
      segments: [
        { id: 'leg', from: 'hip', to: 'knee', width: 8, color: '#202020' },
      ],
    });
  });

  it('rejects malformed JSON', () => {
    expect(() => parseStickFigureJson('{')).toThrow(
      new InvalidStickFigureError('The selected file is not valid JSON.'),
    );
  });

  it('rejects segments that reference missing joints', () => {
    const invalidFigure = {
      ...validFigure,
      segments: [{ id: 'leg', from: 'hip', to: 'ankle' }],
    };

    expect(() => parseStickFigureJson(JSON.stringify(invalidFigure))).toThrow(
      'Segment "leg" references an unknown joint.',
    );
  });

  it('rejects duplicate joint ids', () => {
    const invalidFigure = {
      ...validFigure,
      joints: [...validFigure.joints, { id: 'hip', x: 0, y: 0 }],
    };

    expect(() => parseStickFigureJson(JSON.stringify(invalidFigure))).toThrow(
      'Joint id "hip" is duplicated.',
    );
  });
});
