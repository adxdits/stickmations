import { DOCUMENT } from '@angular/common';
import { computed, inject, Injectable, signal } from '@angular/core';
import type { StickFigure } from '@stickmations/engine';
import { isSavableFigure } from '../domain/figure-draft';
import type { StickmationsDesktopApi } from './desktop-api';
import { figureFileName, serializeFigureFile } from './figure-file';
import { downloadBlob } from './file-download';

export type FigureSavePhase = 'idle' | 'saving' | 'complete' | 'error';

export interface FigureSaveState {
  readonly phase: FigureSavePhase;
  readonly outputPath: string | null;
  readonly error: string | null;
}

const IDLE_STATE: FigureSaveState = { phase: 'idle', outputPath: null, error: null };

@Injectable({ providedIn: 'root' })
export class FigureSaveService {
  private readonly document = inject(DOCUMENT);
  readonly state = signal<FigureSaveState>(IDLE_STATE);
  readonly isActive = computed(() => this.state().phase === 'saving');
  private operationId = 0;

  async save(figure: StickFigure): Promise<void> {
    if (this.isActive() || !isSavableFigure(figure)) {
      return;
    }

    const operationId = ++this.operationId;
    this.state.set({ phase: 'saving', outputPath: null, error: null });

    try {
      const contents = serializeFigureFile(figure);
      const desktop = window.stickmationsDesktop;
      const outputPath = desktop?.saveFigure
        ? await saveThroughDesktop(desktop, figure.name, contents)
        : downloadFigureFile(this.document, figure.name, contents);

      if (this.operationId !== operationId) {
        return;
      }
      this.state.set(
        outputPath === null ? IDLE_STATE : { phase: 'complete', outputPath, error: null },
      );
    } catch (error: unknown) {
      if (this.operationId === operationId) {
        this.state.set({ phase: 'error', outputPath: null, error: errorMessage(error) });
      }
    }
  }

  dismiss(): void {
    if (!this.isActive()) {
      this.state.set(IDLE_STATE);
    }
  }
}

/** Returns the written path, or null when the person dismissed the save dialog. */
async function saveThroughDesktop(
  desktop: StickmationsDesktopApi,
  name: string,
  contents: string,
): Promise<string | null> {
  const result = await desktop.saveFigure!({ suggestedName: figureFileName(name), contents });
  return result.status === 'saved' ? result.path : null;
}

function downloadFigureFile(document: Document, name: string, contents: string): string {
  return downloadBlob(
    document,
    new Blob([contents], { type: 'application/json' }),
    figureFileName(name),
  );
}

function errorMessage(error: unknown): string {
  return error instanceof Error && error.message.trim()
    ? error.message
    : 'The figure could not be saved.';
}
