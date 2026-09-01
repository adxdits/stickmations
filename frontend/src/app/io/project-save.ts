import { DOCUMENT } from '@angular/common';
import { computed, inject, Injectable, signal } from '@angular/core';
import type { FramationDesktopApi, StartProjectSaveResult } from './desktop-api';
import { PROJECT_FILE_EXTENSION, serializeProjectFile, type ProjectSnapshot } from './project-file';

export type ProjectSavePhase = 'idle' | 'saving' | 'complete' | 'error';

export interface ProjectSaveState {
  readonly phase: ProjectSavePhase;
  readonly outputPath: string | null;
  readonly error: string | null;
}

type ProjectSaveDesktopApi = Required<
  Pick<
    FramationDesktopApi,
    'startProjectSave' | 'writeProjectChunk' | 'completeProjectSave' | 'cancelProjectSave'
  >
>;

const IDLE_STATE: ProjectSaveState = {
  phase: 'idle',
  outputPath: null,
  error: null,
};

@Injectable({ providedIn: 'root' })
export class ProjectSaveService {
  private readonly document = inject(DOCUMENT);
  readonly state = signal<ProjectSaveState>(IDLE_STATE);
  readonly isActive = computed(() => this.state().phase === 'saving');
  private operationId = 0;

  save(snapshot: ProjectSnapshot): Promise<void> {
    if (this.isActive() || snapshot.frames.length === 0) {
      return Promise.resolve();
    }

    return this.runSave(++this.operationId, snapshot);
  }

  dismiss(): void {
    if (!this.isActive()) {
      this.state.set(IDLE_STATE);
    }
  }

  private async runSave(operationId: number, snapshot: ProjectSnapshot): Promise<void> {
    this.state.set({ phase: 'saving', outputPath: null, error: null });
    const desktop = projectSaveDesktopApi(window.framationDesktop);
    let sessionId: string | null = null;

    try {
      let outputPath: string;
      if (desktop) {
        const start = await desktop.startProjectSave({ suggestedName: snapshot.name });
        sessionId = activeSessionId(start);
        if (!sessionId) {
          this.resetIfCurrent(operationId);
          return;
        }
        for (const chunk of serializeProjectFile(snapshot)) {
          await desktop.writeProjectChunk(sessionId, chunk);
        }
        outputPath = (await desktop.completeProjectSave(sessionId)).path;
        sessionId = null;
      } else {
        outputPath = await downloadProjectFile(this.document, snapshot);
      }

      if (this.operationId === operationId) {
        this.state.set({ phase: 'complete', outputPath, error: null });
      }
    } catch (error: unknown) {
      if (sessionId && desktop) {
        await desktop.cancelProjectSave(sessionId).catch(() => undefined);
      }
      if (this.operationId === operationId) {
        this.state.set({ phase: 'error', outputPath: null, error: errorMessage(error) });
      }
    }
  }

  private resetIfCurrent(operationId: number): void {
    if (this.operationId === operationId) {
      this.state.set(IDLE_STATE);
    }
  }
}

function projectSaveDesktopApi(
  desktop: FramationDesktopApi | undefined,
): ProjectSaveDesktopApi | null {
  return desktop &&
    desktop.startProjectSave &&
    desktop.writeProjectChunk &&
    desktop.completeProjectSave &&
    desktop.cancelProjectSave
    ? (desktop as ProjectSaveDesktopApi)
    : null;
}

function activeSessionId(result: StartProjectSaveResult): string | null {
  return result.status === 'ready' ? result.sessionId : null;
}

async function downloadProjectFile(document: Document, snapshot: ProjectSnapshot): Promise<string> {
  if (typeof CompressionStream === 'undefined') {
    throw new Error('This browser cannot create compressed project files.');
  }

  const fileName = projectFileName(snapshot.name);
  const compressed = projectFileStream(snapshot).pipeThrough(new CompressionStream('gzip'));
  const blob = await new Response(compressed).blob();
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = fileName;
  link.click();
  URL.revokeObjectURL(url);
  return fileName;
}

function projectFileStream(snapshot: ProjectSnapshot): ReadableStream<BufferSource> {
  const chunks = serializeProjectFile(snapshot);
  return new ReadableStream<BufferSource>({
    pull(controller) {
      const result = chunks.next();
      if (result.done) {
        controller.close();
      } else {
        controller.enqueue(result.value);
      }
    },
  });
}

export function projectFileName(suggestedName: string): string {
  const name = suggestedName
    .replace(/[<>:"/|?*\u0000-\u001f]/g, '_')
    .replaceAll('\\', '_')
    .trim();
  const safeName = name || 'Untitled project';
  return safeName.toLowerCase().endsWith(PROJECT_FILE_EXTENSION)
    ? safeName
    : `${safeName}${PROJECT_FILE_EXTENSION}`;
}

function errorMessage(error: unknown): string {
  return error instanceof Error && error.message.trim()
    ? error.message
    : 'The project could not be saved.';
}
