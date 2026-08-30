import type { StickFigure } from '@framation/engine';
import { createFigurePreview, createScenePreview } from './figure-preview';
import { createFigureLayer } from './scene-frame';

describe('createFigurePreview', () => {
  it('keeps the root control and hides static detail nodes', () => {
    const figure: StickFigure = {
      version: 1,
      name: 'Rig',
      joints: [
        { id: 'root', x: 0, y: 0, radius: 1, color: '#000000', isStatic: false },
        { id: 'neck', x: 0, y: 50, radius: 1, color: '#000000', isStatic: true },
        { id: 'head', x: 0, y: 100, radius: 1, color: '#000000', isStatic: false },
        { id: 'left-hand', x: -100, y: 0, radius: 1, color: '#000000', isStatic: false },
        { id: 'right-hand', x: 100, y: 0, radius: 1, color: '#000000', isStatic: false },
        { id: 'left-foot', x: -40, y: -100, radius: 1, color: '#000000', isStatic: false },
        { id: 'right-foot', x: 40, y: -100, radius: 1, color: '#000000', isStatic: false },
        { id: 'detail', x: 10, y: 20, radius: 1, color: '#000000', isStatic: true },
      ],
      segments: [
        { id: 'neck', from: 'root', to: 'neck', width: 4, color: '#000000' },
        { id: 'head-shape', from: 'neck', to: 'head', width: 4, color: '#000000', shape: 'circle' },
        { id: 'left-arm', from: 'root', to: 'left-hand', width: 4, color: '#000000' },
        { id: 'right-arm', from: 'root', to: 'right-hand', width: 4, color: '#000000' },
        { id: 'left-leg', from: 'root', to: 'left-foot', width: 4, color: '#000000' },
        { id: 'right-leg', from: 'root', to: 'right-foot', width: 4, color: '#000000' },
        { id: 'detail', from: 'root', to: 'detail', width: 1, color: '#000000' },
      ],
    };

    const preview = createFigurePreview(figure);

    expect(preview.center.id).toBe('root');
    expect(preview.editableJoints.map(({ id }) => id)).toContain('left-hand');
    expect(preview.editableJoints.map(({ id }) => id)).not.toContain('detail');
  });
});

describe('createScenePreview', () => {
  it('renders figures with overlapping source ids as separate layers', () => {
    const figure: StickFigure = {
      version: 1,
      name: 'Figure',
      joints: [
        { id: 'root', x: 0, y: 0, radius: 1, color: '#000000' },
        { id: 'tip', x: 10, y: 0, radius: 1, color: '#000000' },
      ],
      segments: [{ id: 'line', from: 'root', to: 'tip', width: 1, color: '#000000' }],
    };

    const preview = createScenePreview([
      createFigureLayer('first', figure),
      createFigureLayer('second', figure),
    ]);

    expect(preview.segments).toHaveLength(2);
    expect(new Set(preview.segments.map(({ id }) => id)).size).toBe(2);
  });
});
