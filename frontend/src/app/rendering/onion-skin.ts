import type { SceneFrame } from '../domain/scene-frame';
import type { PreviewDrawable } from './figure-geometry';
import { createScenePreview } from './figure-preview';

export interface OnionSkin {
  readonly key: string;
  /** Negative for frames before the current one, positive for frames after it. */
  readonly offset: number;
  readonly opacity: number;
  readonly drawables: readonly PreviewDrawable[];
}

export interface OnionSkinOptions {
  /** How many frames before the current one to ghost. */
  readonly before: number;
  /** How many frames after the current one to ghost. */
  readonly after: number;
}

export const MAX_ONION_FRAMES = 5;
/** Tint for frames already played, borrowed from the usual warm/cool onion convention. */
export const PAST_TINT = '#E0705A';
/** Tint for frames still to come. */
export const FUTURE_TINT = '#4F9BD9';
const NEAREST_OPACITY = 0.4;

/**
 * Builds the ghost layers drawn behind the current frame. Each skin is tinted by direction and
 * fades with distance, so the nearest frames read strongest.
 *
 * `currentFrame` is 1-based, matching the editor's frame numbering.
 */
export function createOnionSkins(
  frames: readonly SceneFrame[],
  currentFrame: number,
  options: OnionSkinOptions,
): readonly OnionSkin[] {
  const currentIndex = currentFrame - 1;
  if (currentIndex < 0 || currentIndex >= frames.length) {
    return [];
  }

  const before = clampCount(options.before);
  const after = clampCount(options.after);
  const skins: OnionSkin[] = [];

  // Farthest first, so nearer ghosts paint over more distant ones.
  for (let distance = before; distance >= 1; distance -= 1) {
    const skin = createSkin(frames, currentIndex - distance, -distance);
    if (skin) {
      skins.push(skin);
    }
  }
  for (let distance = after; distance >= 1; distance -= 1) {
    const skin = createSkin(frames, currentIndex + distance, distance);
    if (skin) {
      skins.push(skin);
    }
  }
  return skins;
}

function createSkin(
  frames: readonly SceneFrame[],
  index: number,
  offset: number,
): OnionSkin | null {
  const frame = frames[index];
  if (!frame) {
    return null;
  }

  const tint = offset < 0 ? PAST_TINT : FUTURE_TINT;
  const drawables = createScenePreview(frame.figures).drawables.map((drawable) =>
    tintDrawable(drawable, tint),
  );
  if (drawables.length === 0) {
    return null;
  }
  return {
    key: `onion-${offset}`,
    offset,
    opacity: NEAREST_OPACITY / Math.abs(offset),
    drawables,
  };
}

/** Recolors a drawable to a single tint, leaving unpainted fills and strokes untouched. */
function tintDrawable(drawable: PreviewDrawable, tint: string): PreviewDrawable {
  if (drawable.kind === 'line') {
    return { ...drawable, color: tint };
  }
  return {
    ...drawable,
    fill: paint(drawable.fill, tint),
    stroke: paint(drawable.stroke, tint),
  };
}

function paint(value: string, tint: string): string {
  return value === 'none' ? value : tint;
}

function clampCount(value: number): number {
  if (!Number.isFinite(value)) {
    return 0;
  }
  return Math.min(MAX_ONION_FRAMES, Math.max(0, Math.floor(value)));
}
