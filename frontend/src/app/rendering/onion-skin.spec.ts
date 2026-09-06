import type { StickFigure } from '@stickmations/engine';
import { describe, expect, it } from 'vitest';
import { createFigureLayer, createSceneFrame, type SceneFrame } from '../domain/scene-frame';
import { createOnionSkins, FUTURE_TINT, PAST_TINT } from './onion-skin';

function figureAt(x: number): StickFigure {
  return {
    version: 1,
    name: 'Walker',
    joints: [
      { id: 'a', x, y: 0, radius: 5, color: '#202020' },
      { id: 'b', x, y: 40, radius: 5, color: '#202020' },
    ],
    segments: [{ id: 's', from: 'a', to: 'b', width: 8, color: '#123456' }],
  };
}

function frames(count: number): readonly SceneFrame[] {
  return Array.from({ length: count }, (_, index) =>
    createSceneFrame(createFigureLayer(`figure-${index}`, figureAt(index * 10))),
  );
}

describe('onion skins', () => {
  it('ghosts one frame either side of the current one', () => {
    const skins = createOnionSkins(frames(5), 3, { before: 1, after: 1 });

    expect(skins.map(({ offset }) => offset)).toEqual([-1, 1]);
  });

  it('tints past frames warm and future frames cool', () => {
    const skins = createOnionSkins(frames(5), 3, { before: 1, after: 1 });

    const past = skins.find(({ offset }) => offset === -1);
    const future = skins.find(({ offset }) => offset === 1);
    expect(JSON.stringify(past?.drawables)).toContain(PAST_TINT);
    expect(JSON.stringify(future?.drawables)).toContain(FUTURE_TINT);
    // The frame's own colour is replaced, so ghosts never read as the live figure.
    expect(JSON.stringify(past?.drawables)).not.toContain('#123456');
  });

  it('fades with distance and paints the farthest ghost first', () => {
    const skins = createOnionSkins(frames(7), 4, { before: 3, after: 0 });

    expect(skins.map(({ offset }) => offset)).toEqual([-3, -2, -1]);
    const opacities = skins.map(({ opacity }) => opacity);
    expect(opacities[0]).toBeLessThan(opacities[2]!);
  });

  it('stops at the ends of the animation instead of wrapping', () => {
    expect(createOnionSkins(frames(3), 1, { before: 2, after: 0 })).toEqual([]);
    expect(createOnionSkins(frames(3), 3, { before: 0, after: 2 })).toEqual([]);

    const atStart = createOnionSkins(frames(3), 2, { before: 2, after: 2 });
    expect(atStart.map(({ offset }) => offset)).toEqual([-1, 1]);
  });

  it('returns nothing for an out-of-range or empty frame list', () => {
    expect(createOnionSkins([], 1, { before: 2, after: 2 })).toEqual([]);
    expect(createOnionSkins(frames(3), 0, { before: 1, after: 1 })).toEqual([]);
    expect(createOnionSkins(frames(3), 9, { before: 1, after: 1 })).toEqual([]);
  });

  it('draws nothing when both counts are zero', () => {
    expect(createOnionSkins(frames(5), 3, { before: 0, after: 0 })).toEqual([]);
  });

  it('clamps absurd counts rather than building endless ghosts', () => {
    const skins = createOnionSkins(frames(40), 20, { before: 99, after: 99 });

    expect(skins).toHaveLength(10);
  });
});
