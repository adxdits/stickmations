import { Injectable, computed, signal } from '@angular/core';
import { appendHistory, type EditorSnapshot } from '../domain/editor-history';

@Injectable({ providedIn: 'root' })
export class EditorHistoryStore {
  private readonly undoStack = signal<readonly EditorSnapshot[]>([]);
  private readonly redoStack = signal<readonly EditorSnapshot[]>([]);
  private pendingEdit: EditorSnapshot | null = null;
  private editRecorded = false;

  readonly canUndo = computed(() => this.undoStack().length > 0);
  readonly canRedo = computed(() => this.redoStack().length > 0);

  beginEdit(snapshot: EditorSnapshot): void {
    if (!this.pendingEdit) {
      this.pendingEdit = snapshot;
      this.editRecorded = false;
    }
  }

  endEdit(): void {
    this.pendingEdit = null;
    this.editRecorded = false;
  }

  record(snapshot: EditorSnapshot): void {
    const pendingEdit = this.pendingEdit;
    if (pendingEdit) {
      if (this.editRecorded) {
        return;
      }
      this.undoStack.update((entries) => appendHistory(entries, pendingEdit));
      this.editRecorded = true;
    } else {
      this.undoStack.update((entries) => appendHistory(entries, snapshot));
    }
    this.redoStack.set([]);
  }

  undo(current: EditorSnapshot): EditorSnapshot | null {
    const entries = this.undoStack();
    const previous = entries.at(-1) ?? null;
    if (!previous) {
      return null;
    }
    this.redoStack.update((history) => appendHistory(history, current));
    this.undoStack.set(entries.slice(0, -1));
    this.endEdit();
    return previous;
  }

  redo(current: EditorSnapshot): EditorSnapshot | null {
    const entries = this.redoStack();
    const next = entries.at(-1) ?? null;
    if (!next) {
      return null;
    }
    this.undoStack.update((history) => appendHistory(history, current));
    this.redoStack.set(entries.slice(0, -1));
    this.endEdit();
    return next;
  }

  reset(): void {
    this.undoStack.set([]);
    this.redoStack.set([]);
    this.endEdit();
  }
}
