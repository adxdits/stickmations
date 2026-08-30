import { Injectable, signal } from '@angular/core';

export type WorkspacePanel = 'project' | 'sceneStrip' | 'timeline' | 'inspector';

export interface WorkspaceLayout {
  readonly project: boolean;
  readonly sceneStrip: boolean;
  readonly timeline: boolean;
  readonly inspector: boolean;
}

const STORAGE_KEY = 'framation.workspace-layout.v1';
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
    const stored = globalThis.localStorage?.getItem(STORAGE_KEY);
    const value = stored ? (JSON.parse(stored) as Partial<WorkspaceLayout>) : null;
    if (
      value &&
      Object.keys(DEFAULT_LAYOUT).every((key) => typeof value[key as WorkspacePanel] === 'boolean')
    ) {
      return { ...DEFAULT_LAYOUT, ...value };
    }
  } catch {
    // Invalid or unavailable storage falls back to the standard workspace.
  }
  return DEFAULT_LAYOUT;
}
