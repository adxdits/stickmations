import type { SceneFrame } from './scene-frame';

export const MAX_HISTORY_ENTRIES = 100;

export interface EditorSnapshot {
  readonly frames: readonly SceneFrame[];
  readonly currentFrame: number;
  readonly selectedFigureId: string | null;
  readonly fps: number;
}

export interface FrameMove {
  readonly from: number;
  readonly to: number;
}

export function appendHistory(
  history: readonly EditorSnapshot[],
  snapshot: EditorSnapshot,
): readonly EditorSnapshot[] {
  return [...history.slice(-(MAX_HISTORY_ENTRIES - 1)), snapshot];
}

export function reorderFrames(
  frames: readonly SceneFrame[],
  move: FrameMove,
): readonly SceneFrame[] {
  if (move.from === move.to || move.from < 0 || move.to < 0) {
    return frames;
  }
  if (move.from >= frames.length || move.to >= frames.length) {
    return frames;
  }

  const reordered = [...frames];
  const [frame] = reordered.splice(move.from, 1);
  if (!frame) {
    return frames;
  }
  reordered.splice(move.to, 0, frame);
  return reordered;
}
