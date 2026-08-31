import { computed, inject, Injectable, InjectionToken, signal } from '@angular/core';
import type { SceneFrame } from '../domain/scene-frame';
import { renderVideoFramePng } from '../rendering/video-frame-renderer';

export type Mp4ExportPhase = 'idle' | 'preparing' | 'rendering' | 'encoding' | 'complete' | 'error';

export interface Mp4ExportState {
  readonly phase: Mp4ExportPhase;
  readonly renderedFrames: number;
  readonly totalFrames: number;
  readonly outputPath: string | null;
  readonly error: string | null;
}

interface StartMp4ExportOptions {
  readonly suggestedName: string;
  readonly fps: number;
  readonly frameCount: number;
}

type StartMp4ExportResult =
  Readonly<{ status: 'ready'; sessionId: string }> | Readonly<{ status: 'cancelled' }>;

interface FramationDesktopApi {
  startMp4Export(options: StartMp4ExportOptions): Promise<StartMp4ExportResult>;
  writeMp4Frame(sessionId: string, frame: Uint8Array): Promise<void>;
  completeMp4Export(sessionId: string): Promise<Readonly<{ path: string }>>;
  cancelMp4Export(sessionId: string): Promise<void>;
}

declare global {
  interface Window {
    framationDesktop?: FramationDesktopApi;
  }
}

const IDLE_STATE: Mp4ExportState = {
  phase: 'idle',
  renderedFrames: 0,
  totalFrames: 0,
  outputPath: null,
  error: null,
};

export const VIDEO_FRAME_RENDERER = new InjectionToken<(frame: SceneFrame) => Promise<Uint8Array>>(
  'VIDEO_FRAME_RENDERER',
  {
    providedIn: 'root',
    factory: () => renderVideoFramePng,
  },
);

@Injectable({ providedIn: 'root' })
export class Mp4ExportService {
  private readonly renderFrame = inject(VIDEO_FRAME_RENDERER);
  readonly state = signal<Mp4ExportState>(IDLE_STATE);
  readonly isActive = computed(() => {
    const phase = this.state().phase;
    return phase === 'preparing' || phase === 'rendering' || phase === 'encoding';
  });
  readonly isAvailable = typeof window !== 'undefined' && Boolean(window.framationDesktop);
  private operationId = 0;
  private activeSession: Readonly<{ operationId: number; sessionId: string }> | null = null;

  export(frames: readonly SceneFrame[], fps: number, suggestedName: string): Promise<void> {
    const desktop = this.prepareExport(frames.length);
    return desktop ? this.runExport(desktop, frames, fps, suggestedName) : Promise.resolve();
  }

  async cancel(): Promise<void> {
    if (this.isActive()) {
      this.operationId += 1;
      const session = this.activeSession;
      this.activeSession = null;
      if (session && window.framationDesktop) {
        await window.framationDesktop.cancelMp4Export(session.sessionId).catch(() => undefined);
      }
      this.state.set(IDLE_STATE);
    }
  }

  dismiss(): void {
    if (!this.isActive()) {
      this.state.set(IDLE_STATE);
    }
  }

  private prepareExport(frameCount: number): FramationDesktopApi | null {
    if (this.isActive()) {
      return null;
    }
    const desktop = window.framationDesktop;
    if (!desktop) {
      this.fail('MP4 export is only available in the Framation desktop app.', frameCount);
      return null;
    }
    if (frameCount === 0) {
      this.fail('Add at least one frame before exporting.', 0);
      return null;
    }
    return desktop;
  }

  private async runExport(
    desktop: FramationDesktopApi,
    frames: readonly SceneFrame[],
    fps: number,
    suggestedName: string,
  ): Promise<void> {
    const operationId = ++this.operationId;
    let sessionId: string | null = null;
    this.state.set({
      phase: 'preparing',
      renderedFrames: 0,
      totalFrames: frames.length,
      outputPath: null,
      error: null,
    });

    try {
      sessionId = await this.startSession(desktop, operationId, frames.length, fps, suggestedName);
      if (!sessionId) {
        return;
      }
      const rendered = await this.renderFrames(desktop, operationId, sessionId, frames);
      if (!rendered) {
        return;
      }
      await this.completeExport(desktop, operationId, sessionId);
    } catch (error) {
      await this.handleFailure(desktop, operationId, sessionId, frames.length, error);
    }
  }

  private async startSession(
    desktop: FramationDesktopApi,
    operationId: number,
    frameCount: number,
    fps: number,
    suggestedName: string,
  ): Promise<string | null> {
    const start = await desktop.startMp4Export({ suggestedName, fps, frameCount });
    if (start.status === 'cancelled') {
      this.resetIfCurrent(operationId);
      return null;
    }
    if (!this.isCurrent(operationId)) {
      await cancelDesktopSession(desktop, start.sessionId);
      return null;
    }
    this.activeSession = { operationId, sessionId: start.sessionId };
    return start.sessionId;
  }

  private async renderFrames(
    desktop: FramationDesktopApi,
    operationId: number,
    sessionId: string,
    frames: readonly SceneFrame[],
  ): Promise<boolean> {
    for (const [index, frame] of frames.entries()) {
      this.state.update((state) => ({ ...state, phase: 'rendering' }));
      const png = await this.renderFrame(frame);
      if (!this.isCurrent(operationId)) {
        await cancelDesktopSession(desktop, sessionId);
        return false;
      }
      await desktop.writeMp4Frame(sessionId, png);
      if (!this.isCurrent(operationId)) {
        return false;
      }
      this.state.update((state) => ({ ...state, renderedFrames: index + 1 }));
    }
    return true;
  }

  private async completeExport(
    desktop: FramationDesktopApi,
    operationId: number,
    sessionId: string,
  ): Promise<void> {
    if (!this.isCurrent(operationId)) {
      return;
    }
    this.state.update((state) => ({ ...state, phase: 'encoding' }));
    const result = await desktop.completeMp4Export(sessionId);
    this.clearSession(operationId);
    if (this.isCurrent(operationId)) {
      this.state.update((state) => ({
        ...state,
        phase: 'complete',
        outputPath: result.path,
      }));
    }
  }

  private async handleFailure(
    desktop: FramationDesktopApi,
    operationId: number,
    sessionId: string | null,
    frameCount: number,
    error: unknown,
  ): Promise<void> {
    if (sessionId) {
      await cancelDesktopSession(desktop, sessionId);
    }
    this.clearSession(operationId);
    if (this.isCurrent(operationId)) {
      this.fail(errorMessage(error), frameCount);
    }
  }

  private isCurrent(operationId: number): boolean {
    return this.operationId === operationId;
  }

  private clearSession(operationId: number): void {
    if (this.activeSession?.operationId === operationId) {
      this.activeSession = null;
    }
  }

  private resetIfCurrent(operationId: number): void {
    if (this.isCurrent(operationId)) {
      this.state.set(IDLE_STATE);
    }
  }

  private fail(error: string, totalFrames: number): void {
    this.state.set({
      phase: 'error',
      renderedFrames: 0,
      totalFrames,
      outputPath: null,
      error,
    });
  }
}

async function cancelDesktopSession(
  desktop: FramationDesktopApi,
  sessionId: string,
): Promise<void> {
  await desktop.cancelMp4Export(sessionId).catch(() => undefined);
}

function errorMessage(error: unknown): string {
  return error instanceof Error && error.message.trim()
    ? error.message
    : 'The MP4 export could not be completed.';
}
