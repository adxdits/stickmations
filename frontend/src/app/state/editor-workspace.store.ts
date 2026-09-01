import { Injectable, signal } from '@angular/core';

export type WorkspacePanel = 'project' | 'sceneStrip' | 'timeline' | 'inspector';

export interface WorkspaceLayout {
  readonly project: boolean;
  readonly sceneStrip: boolean;
  readonly timeline: boolean;
  readonly inspector: boolean;
}

const STORAGE_KEY = 'stickmations.workspace-layout.v1';
const LEGACY_STORAGE_KEY = 'framation.workspace-layout.v1';
const DEFAULT_LAYOUT: WorkspaceLayout = {
  project: true,
  sceneStrip: true,
  timeline: true,
  inspector: true,
};

@Injectable({ providedIn: 'root' })
export class EditorWorkspaceStore {
  readonly layout = signal<WorkspaceLayout>(loadLayout());
  readonly canvasFocused = signal(false);

  isVisible(panel: WorkspacePanel): boolean {
    return !this.canvasFocused() && this.layout()[panel];
  }

  toggle(panel: WorkspacePanel): void {
    this.setLayout({ ...this.layout(), [panel]: !this.layout()[panel] });
  }

  focusCanvas(): void {
    this.canvasFocused.set(true);
  }

  toggleCanvasFocus(): void {
    this.canvasFocused.update((focused) => !focused);
  }

  reset(): void {
    this.canvasFocused.set(false);
    this.setLayout(DEFAULT_LAYOUT);
  }

  private setLayout(layout: WorkspaceLayout): void {
    this.layout.set(layout);
    try {
      globalThis.localStorage?.setItem(STORAGE_KEY, JSON.stringify(layout));
    } catch {
      // Workspace customization remains available for the current session.
    }
  }
}

function loadLayout(): WorkspaceLayout {
  try {
    const storage = globalThis.localStorage;
    const current = storage?.getItem(STORAGE_KEY);
    const legacy = current == null ? storage?.getItem(LEGACY_STORAGE_KEY) : null;
    const stored = current ?? legacy;
    const value = stored ? (JSON.parse(stored) as Partial<WorkspaceLayout>) : null;
    if (
      value &&
      Object.keys(DEFAULT_LAYOUT).every((key) => typeof value[key as WorkspacePanel] === 'boolean')
    ) {
      const layout = { ...DEFAULT_LAYOUT, ...value };
      if (legacy != null) {
        try {
          storage?.setItem(STORAGE_KEY, JSON.stringify(layout));
          storage?.removeItem(LEGACY_STORAGE_KEY);
        } catch {
          // Keep the migrated layout available for this session.
        }
      }
      return layout;
    }
  } catch {
    // Invalid or unavailable storage falls back to the standard workspace.
  }
  return DEFAULT_LAYOUT;
}
