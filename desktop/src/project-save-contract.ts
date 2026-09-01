export const PROJECT_SAVE_CHANNELS = {
  start: 'project-save:start',
  writeChunk: 'project-save:write-chunk',
  complete: 'project-save:complete',
  cancel: 'project-save:cancel',
} as const;

export interface StartProjectSaveOptions {
  readonly suggestedName: string;
}

export type StartProjectSaveResult =
  | Readonly<{ status: 'ready'; sessionId: string }>
  | Readonly<{ status: 'cancelled' }>;

export interface CompleteProjectSaveResult {
  readonly path: string;
}
