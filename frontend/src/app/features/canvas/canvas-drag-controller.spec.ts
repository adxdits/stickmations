import type { StickFigure } from '@stickmations/engine';
import { describe, expect, it } from 'vitest';
import type { SceneCamera } from '../../domain/scene-frame';
import { CanvasDragController, type CanvasPoint } from './canvas-drag-controller';

const camera: SceneCamera = {
  positionX: 10,
  positionY: 20,
  width: 320,
  height: 180,
  rotation: 0,
};

const figure: StickFigure = {
  version: 1,
  name: 'Figure',
  joints: [{ id: 'root', x: 0, y: 0, radius: 1, color: '#000000' }],
  segments: [],
};

describe('CanvasDragController', () => {
  it('moves the viewport from a captured pan origin', () => {
    const drag = new CanvasDragController();
    drag.startPan({ x: 10, y: 20 }, { x: 5, y: -5 }, 2);

    expect(drag.movePan({ x: 25, y: 10 })).toEqual({ x: 35, y: -25 });
    expect(drag.clear()).toBe(false);
  });

  it('moves a figure when browser point coordinates are non-enumerable', () => {
    const drag = new CanvasDragController();
    drag.startFigure('translate-figure', browserPoint(10, 20));

    const firstMove = drag.moveFigure(figure, browserPoint(15, 25));
    const secondMove = firstMove && drag.moveFigure(firstMove, browserPoint(20, 30));

    expect(firstMove?.joints[0]).toMatchObject({ x: 5, y: -5 });
    expect(secondMove?.joints[0]).toMatchObject({ x: 10, y: -10 });
  });

  it('moves and resizes a camera from its captured state', () => {
    const drag = new CanvasDragController();
    drag.startCamera('move', { x: 0, y: 0 }, camera);

    expect(drag.moveCamera({ x: 15, y: -5 })).toEqual([
      { property: 'positionX', value: 25 },
      { property: 'positionY', value: 15 },
    ]);
    expect(drag.clear()).toBe(true);

    drag.startCamera('resize', { x: 0, y: 0 }, camera);
    expect(drag.moveCamera({ x: 10, y: 5 })).toEqual([
      { property: 'width', value: 340 },
      { property: 'height', value: 190 },
    ]);
  });

  it('rotates a camera around its center', () => {
    const drag = new CanvasDragController();
    drag.startCamera('rotate', { x: 10, y: -100 }, camera);

    expect(drag.moveCamera({ x: 110, y: 20 })).toEqual([{ property: 'rotation', value: 90 }]);
  });
});

function browserPoint(x: number, y: number): CanvasPoint {
  return Object.defineProperties(
    {},
    {
      x: { value: x },
      y: { value: y },
    },
  ) as CanvasPoint;
}
