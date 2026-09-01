import { contextBridge, ipcRenderer } from "electron";
import type {
  CompleteMp4ExportResult,
  StartMp4ExportOptions,
  StartMp4ExportResult,
} from "./mp4-export-contract.js";
import type {
  CompleteProjectSaveResult,
  StartProjectSaveOptions,
  StartProjectSaveResult,
} from "./project-save-contract.js";

const MP4_EXPORT_CHANNELS = {
  start: "mp4-export:start",
  writeFrame: "mp4-export:write-frame",
  complete: "mp4-export:complete",
  cancel: "mp4-export:cancel",
} as const;

const PROJECT_SAVE_CHANNELS = {
  start: "project-save:start",
  writeChunk: "project-save:write-chunk",
  complete: "project-save:complete",
  cancel: "project-save:cancel",
} as const;

contextBridge.exposeInMainWorld("stickmationsDesktop", {
  platform: process.platform,
  versions: {
    chrome: process.versions.chrome,
    electron: process.versions.electron,
  },
  startMp4Export: (options: StartMp4ExportOptions) =>
    ipcRenderer.invoke(
      MP4_EXPORT_CHANNELS.start,
      options,
    ) as Promise<StartMp4ExportResult>,
  writeMp4Frame: (sessionId: string, frame: Uint8Array) =>
    ipcRenderer.invoke(
      MP4_EXPORT_CHANNELS.writeFrame,
      sessionId,
      frame,
    ) as Promise<void>,
  completeMp4Export: (sessionId: string) =>
    ipcRenderer.invoke(
      MP4_EXPORT_CHANNELS.complete,
      sessionId,
    ) as Promise<CompleteMp4ExportResult>,
  cancelMp4Export: (sessionId: string) =>
    ipcRenderer.invoke(MP4_EXPORT_CHANNELS.cancel, sessionId) as Promise<void>,
  startProjectSave: (options: StartProjectSaveOptions) =>
    ipcRenderer.invoke(
      PROJECT_SAVE_CHANNELS.start,
      options,
    ) as Promise<StartProjectSaveResult>,
  writeProjectChunk: (sessionId: string, chunk: Uint8Array) =>
    ipcRenderer.invoke(
      PROJECT_SAVE_CHANNELS.writeChunk,
      sessionId,
      chunk,
    ) as Promise<void>,
  completeProjectSave: (sessionId: string) =>
    ipcRenderer.invoke(
      PROJECT_SAVE_CHANNELS.complete,
      sessionId,
    ) as Promise<CompleteProjectSaveResult>,
  cancelProjectSave: (sessionId: string) =>
    ipcRenderer.invoke(
      PROJECT_SAVE_CHANNELS.cancel,
      sessionId,
    ) as Promise<void>,
});
