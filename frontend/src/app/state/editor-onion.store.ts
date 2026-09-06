import { computed, inject, Injectable, signal } from '@angular/core';
import { createOnionSkins, MAX_ONION_FRAMES, type OnionSkin } from '../rendering/onion-skin';
import { EditorDocumentState } from './editor-document.state';

export interface OnionSettings {
  readonly enabled: boolean;
  readonly before: number;
  readonly after: number;
}

const STORAGE_KEY = 'stickmations.onion-skin.v1';
const DEFAULT_SETTINGS: OnionSettings = { enabled: false, before: 1, after: 1 };

@Injectable({ providedIn: 'root' })
export class EditorOnionStore {
  private readonly document = inject(EditorDocumentState);
  readonly settings = signal<OnionSettings>(loadSettings());

  readonly enabled = computed(() => this.settings().enabled);
  readonly before = computed(() => this.settings().before);
  readonly after = computed(() => this.settings().after);
  readonly maxFrames = MAX_ONION_FRAMES;

  /**
   * Ghost layers for the frame being edited. Empty while the feature is off, which is also what
   * keeps them out of playback: the canvas hides them, and nothing else consumes this.
   */
  readonly skins = computed<readonly OnionSkin[]>(() => {
    const settings = this.settings();
    if (!settings.enabled) {
      return [];
    }
    return createOnionSkins(this.document.animationFrames(), this.document.currentFrame(), {
      before: settings.before,
      after: settings.after,
    });
  });

  toggle(): void {
    this.update({ enabled: !this.settings().enabled });
  }

  setEnabled(enabled: boolean): void {
    this.update({ enabled });
  }

  setBefore(before: number): void {
    this.update({ before: clampCount(before) });
  }

  setAfter(after: number): void {
    this.update({ after: clampCount(after) });
  }

  private update(changes: Partial<OnionSettings>): void {
    const settings = { ...this.settings(), ...changes };
    this.settings.set(settings);
    try {
      globalThis.localStorage?.setItem(STORAGE_KEY, JSON.stringify(settings));
    } catch {
      // Onion skin settings stay available for the current session.
    }
  }
}

function loadSettings(): OnionSettings {
  try {
    const stored = globalThis.localStorage?.getItem(STORAGE_KEY);
    const value = stored ? (JSON.parse(stored) as Partial<OnionSettings>) : null;
    if (value && typeof value.enabled === 'boolean') {
      return {
        enabled: value.enabled,
        before: clampCount(value.before ?? DEFAULT_SETTINGS.before),
        after: clampCount(value.after ?? DEFAULT_SETTINGS.after),
      };
    }
  } catch {
    // Invalid or unavailable storage falls back to onion skins being off.
  }
  return DEFAULT_SETTINGS;
}

function clampCount(value: number): number {
  if (!Number.isFinite(value)) {
    return 0;
  }
  return Math.min(MAX_ONION_FRAMES, Math.max(0, Math.floor(value)));
}
