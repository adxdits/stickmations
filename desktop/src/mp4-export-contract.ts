export const MP4_EXPORT_CHANNELS = {
  start: 'mp4-export:start',
  writeFrame: 'mp4-export:write-frame',
  complete: 'mp4-export:complete',
  cancel: 'mp4-export:cancel',
} as const;

export interface StartMp4ExportOptions {
  readonly suggestedName: string;
  readonly fps: number;
  readonly frameCount: number;
}

export type StartMp4ExportResult =
  | Readonly<{ status: 'ready'; sessionId: string }>
  | Readonly<{ status: 'cancelled' }>;

export interface CompleteMp4ExportResult {
  readonly path: string;
}
