import { computed, Injectable, signal } from '@angular/core';
import type { StickFigure } from '@stickmations/engine';
import {
  addJoint,
  connectJoints,
  createEmptyFigure,
  deleteJoint,
  deleteSegment,
  DEFAULT_JOINT_STYLE,
  DEFAULT_SEGMENT_STYLE,
  isSavableFigure,
  moveJoint,
  renameFigure,
  updateJoint,
  updateSegment,
  type DraftPoint,
  type JointStyle,
  type SegmentStyle,
} from '../domain/figure-draft';

export type FigureTool = 'draw' | 'select' | 'connect' | 'erase';

export interface FigureSelection {
  readonly kind: 'joint' | 'segment';
  readonly id: string;
}

const MAX_HISTORY_ENTRIES = 100;

@Injectable({ providedIn: 'root' })
export class EditorFigureStore {
  readonly isOpen = signal(false);
  readonly figure = signal<StickFigure>(createEmptyFigure());
  readonly tool = signal<FigureTool>('draw');
  readonly selection = signal<FigureSelection | null>(null);
  readonly jointStyle = signal<JointStyle>(DEFAULT_JOINT_STYLE);
  readonly segmentStyle = signal<SegmentStyle>(DEFAULT_SEGMENT_STYLE);
  /** First joint picked by the connect tool, waiting for its partner. */
  readonly connectFrom = signal<string | null>(null);

  private readonly undoStack = signal<readonly StickFigure[]>([]);
  private readonly redoStack = signal<readonly StickFigure[]>([]);
  private pendingEdit: StickFigure | null = null;

  readonly canUndo = computed(() => this.undoStack().length > 0);
  readonly canRedo = computed(() => this.redoStack().length > 0);
  readonly canSave = computed(() => isSavableFigure(this.figure()));
  readonly selectedJoint = computed(() => {
    const selection = this.selection();
    return selection?.kind === 'joint'
      ? (this.figure().joints.find(({ id }) => id === selection.id) ?? null)
      : null;
  });
  readonly selectedSegment = computed(() => {
    const selection = this.selection();
    return selection?.kind === 'segment'
      ? (this.figure().segments.find(({ id }) => id === selection.id) ?? null)
      : null;
  });

  /** Opens the editor, seeding it with `figure` when continuing from an existing one. */
  open(figure?: StickFigure): void {
    this.figure.set(figure ?? createEmptyFigure());
    this.selection.set(null);
    this.connectFrom.set(null);
    this.tool.set('draw');
    this.undoStack.set([]);
    this.redoStack.set([]);
    this.pendingEdit = null;
    this.isOpen.set(true);
  }

  close(): void {
    this.isOpen.set(false);
  }

  setTool(tool: FigureTool): void {
    this.tool.set(tool);
    this.connectFrom.set(null);
  }

  rename(name: string): void {
    this.commit(renameFigure(this.figure(), name));
  }

  /**
   * Handles a click on empty canvas. The draw tool grows the figure from the selected joint, so a
   * limb is built one click at a time; every other tool clears the selection.
   */
  clickCanvas(point: DraftPoint): void {
    if (this.tool() !== 'draw') {
      this.selection.set(null);
      this.connectFrom.set(null);
      return;
    }

    const parentId = this.selectedJoint()?.id ?? null;
    const result = addJoint(this.figure(), point, {
      parentId,
      joint: this.jointStyle(),
      segment: this.segmentStyle(),
    });
    this.commit(result.figure);
    this.selection.set({ kind: 'joint', id: result.jointId });
  }

  clickJoint(jointId: string): void {
    const tool = this.tool();
    if (tool === 'erase') {
      this.commit(deleteJoint(this.figure(), jointId));
      this.selection.set(null);
      return;
    }
    if (tool === 'connect') {
      const from = this.connectFrom();
      if (from === null) {
        this.connectFrom.set(jointId);
        this.selection.set({ kind: 'joint', id: jointId });
        return;
      }
      this.commit(connectJoints(this.figure(), from, jointId, this.segmentStyle()));
      this.connectFrom.set(null);
      this.selection.set({ kind: 'joint', id: jointId });
      return;
    }
    this.selection.set({ kind: 'joint', id: jointId });
  }

  clickSegment(segmentId: string): void {
    if (this.tool() === 'erase') {
      this.commit(deleteSegment(this.figure(), segmentId));
      this.selection.set(null);
      return;
    }
    this.selection.set({ kind: 'segment', id: segmentId });
  }

  dragJoint(jointId: string, point: DraftPoint): void {
    this.commit(moveJoint(this.figure(), jointId, point));
  }

  editJoint(changes: Parameters<typeof updateJoint>[2]): void {
    const joint = this.selectedJoint();
    if (joint) {
      this.commit(updateJoint(this.figure(), joint.id, changes));
    }
  }

  editSegment(changes: Parameters<typeof updateSegment>[2]): void {
    const segment = this.selectedSegment();
    if (segment) {
      this.commit(updateSegment(this.figure(), segment.id, changes));
    }
  }

  deleteSelection(): void {
    const selection = this.selection();
    if (!selection) {
      return;
    }
    this.commit(
      selection.kind === 'joint'
        ? deleteJoint(this.figure(), selection.id)
        : deleteSegment(this.figure(), selection.id),
    );
    this.selection.set(null);
  }

  /** Groups the moves of one pointer drag into a single undo entry. */
  beginEdit(): void {
    this.pendingEdit ??= this.figure();
  }

  endEdit(): void {
    const pendingEdit = this.pendingEdit;
    this.pendingEdit = null;
    if (pendingEdit && pendingEdit !== this.figure()) {
      this.pushUndo(pendingEdit);
    }
  }

  undo(): void {
    const previous = this.undoStack().at(-1);
    if (!previous) {
      return;
    }
    this.redoStack.update((entries) => append(entries, this.figure()));
    this.undoStack.update((entries) => entries.slice(0, -1));
    this.pendingEdit = null;
    this.applyRestored(previous);
  }

  redo(): void {
    const next = this.redoStack().at(-1);
    if (!next) {
      return;
    }
    this.undoStack.update((entries) => append(entries, this.figure()));
    this.redoStack.update((entries) => entries.slice(0, -1));
    this.pendingEdit = null;
    this.applyRestored(next);
  }

  private commit(next: StickFigure): void {
    const current = this.figure();
    if (next === current) {
      return;
    }
    if (this.pendingEdit === null) {
      this.pushUndo(current);
    }
    this.figure.set(next);
  }

  private pushUndo(snapshot: StickFigure): void {
    this.undoStack.update((entries) => append(entries, snapshot));
    this.redoStack.set([]);
  }

  /** Drops a selection that the restored figure no longer contains. */
  private applyRestored(figure: StickFigure): void {
    this.figure.set(figure);
    this.connectFrom.set(null);
    const selection = this.selection();
    if (!selection) {
      return;
    }
    const exists =
      selection.kind === 'joint'
        ? figure.joints.some(({ id }) => id === selection.id)
        : figure.segments.some(({ id }) => id === selection.id);
    if (!exists) {
      this.selection.set(null);
    }
  }
}

function append(entries: readonly StickFigure[], snapshot: StickFigure): readonly StickFigure[] {
  return [...entries.slice(-(MAX_HISTORY_ENTRIES - 1)), snapshot];
}
