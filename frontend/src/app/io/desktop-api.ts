export interface StartMp4ExportOptions {
  readonly suggestedName: string;
  readonly fps: number;
  readonly frameCount: number;
}

export type StartMp4ExportResult =
  Readonly<{ status: 'ready'; sessionId: string }> | Readonly<{ status: 'cancelled' }>;

export interface StartProjectSaveOptions {
  readonly suggestedName: string;
}

export type StartProjectSaveResult =
  Readonly<{ status: 'ready'; sessionId: string }> | Readonly<{ status: 'cancelled' }>;

export interface FramationDesktopApi {
  startMp4Export(options: StartMp4ExportOptions): Promise<StartMp4ExportResult>;
  writeMp4Frame(sessionId: string, frame: Uint8Array): Promise<void>;
  completeMp4Export(sessionId: string): Promise<Readonly<{ path: string }>>;
  cancelMp4Export(sessionId: string): Promise<void>;
  startProjectSave?(options: StartProjectSaveOptions): Promise<StartProjectSaveResult>;
  writeProjectChunk?(sessionId: string, chunk: Uint8Array): Promise<void>;
  completeProjectSave?(sessionId: string): Promise<Readonly<{ path: string }>>;
  cancelProjectSave?(sessionId: string): Promise<void>;
}

declare global {
  interface Window {
    framationDesktop?: FramationDesktopApi;
  }
}
