import { ChangeDetectionStrategy, Component, computed, inject, output } from '@angular/core';
import {
  LucideEraser,
  LucideMousePointer2,
  LucidePencil,
  LucideRedo2,
  LucideSpline,
  LucideUndo2,
} from '@lucide/angular';
import {
  DRAWABLE_SEGMENT_SHAPES,
  type DrawableSegmentShape,
  type DraftPoint,
} from '../../domain/figure-draft';
import { FigureSaveService } from '../../io/figure-save';
import { isEditableTarget } from '../../shared/dom-events';
import { createFigurePreview } from '../../rendering/figure-preview';
import { EditorFigureStore, type FigureTool } from '../../state/editor-figure.store';

interface ToolOption {
  readonly tool: FigureTool;
  readonly label: string;
  readonly tooltip: string;
}

interface ShapeOption {
  readonly value: DrawableSegmentShape;
  readonly label: string;
}

interface JointHandle {
  readonly id: string;
  readonly x: number;
  readonly y: number;
  readonly color: string;
  readonly selected: boolean;
  readonly pendingConnect: boolean;
}

interface SegmentHandle {
  readonly id: string;
  readonly x1: number;
  readonly y1: number;
  readonly x2: number;
  readonly y2: number;
  readonly selected: boolean;
}

/** Half-width of the fixed drawing area, in figure units. */
const CANVAS_EXTENT = 220;
/** Pointer travel, in figure units, before a press on a joint counts as a drag rather than a pick. */
const DRAG_THRESHOLD = 1.5;

@Component({
  selector: 'app-figure-editor',
  imports: [
    LucideUndo2,
    LucideRedo2,
    LucideMousePointer2,
    LucidePencil,
    LucideSpline,
    LucideEraser,
  ],
  templateUrl: './figure-editor.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { '(window:keydown)': 'handleShortcut($event)' },
})
export class FigureEditor {
  protected readonly store = inject(EditorFigureStore);
  protected readonly figureSave = inject(FigureSaveService);
  readonly closed = output<void>();

  protected readonly tools: readonly ToolOption[] = [
    { tool: 'select', label: 'Select', tooltip: 'Select a joint or shape, then restyle it' },
    { tool: 'draw', label: 'Draw', tooltip: 'Draw joints and limbs' },
    { tool: 'connect', label: 'Connect', tooltip: 'Connect two joints' },
    { tool: 'erase', label: 'Erase', tooltip: 'Erase joints and shapes' },
  ];
  protected readonly shapes: readonly ShapeOption[] = [
    { value: 'rounded-segment', label: 'Rounded limb' },
    { value: 'segment', label: 'Flat limb' },
    { value: 'circle', label: 'Circle outline' },
    { value: 'filled-circle', label: 'Filled circle' },
  ];

  /** The drawing area is fixed so the figure does not shift while joints are placed. */
  protected readonly bounds = computed(() => ({
    x: -CANVAS_EXTENT,
    y: -CANVAS_EXTENT,
    width: CANVAS_EXTENT * 2,
    height: CANVAS_EXTENT * 2,
  }));
  protected readonly viewBox = computed(() => {
    const { x, y, width, height } = this.bounds();
    return `${x} ${y} ${width} ${height}`;
  });
  protected readonly preview = computed(() => createFigurePreview(this.store.figure()));
  protected readonly jointHandles = computed<readonly JointHandle[]>(() => {
    const selection = this.store.selection();
    const connectFrom = this.store.connectFrom();
    // Positions come from the preview (already Y-flipped); colours only exist on the figure itself.
    const colors = new Map(this.store.figure().joints.map((joint) => [joint.id, joint.color]));
    return this.preview().joints.map((joint) => ({
      id: joint.id,
      x: joint.x,
      y: joint.y,
      color: colors.get(joint.id) ?? '#D6D6D6',
      selected: selection?.kind === 'joint' && selection.id === joint.id,
      pendingConnect: connectFrom === joint.id,
    }));
  });
  protected readonly segmentHandles = computed<readonly SegmentHandle[]>(() => {
    const selection = this.store.selection();
    const positions = new Map(this.preview().joints.map((joint) => [joint.id, joint]));
    return this.store.figure().segments.flatMap((segment) => {
      const from = positions.get(segment.from);
      const to = positions.get(segment.to);
      return from && to
        ? [
            {
              id: segment.id,
              x1: from.x,
              y1: from.y,
              x2: to.x,
              y2: to.y,
              selected: selection?.kind === 'segment' && selection.id === segment.id,
            },
          ]
        : [];
    });
  });
  protected readonly hint = computed(() => {
    switch (this.store.tool()) {
      case 'draw':
        return this.store.selectedJoint()
          ? 'Click to add a joint linked to the selected one.'
          : 'Click to place a joint. Select one to grow from it.';
      case 'select':
        return 'Drag a joint to move it. Click a shape to edit it.';
      case 'connect':
        return this.store.connectFrom()
          ? 'Now click the joint to connect to.'
          : 'Click the first joint to connect.';
      case 'erase':
        return 'Click a joint or shape to remove it.';
    }
  });

  private draggingJointId: string | null = null;
  private dragMoved = false;
  private dragStart: DraftPoint | null = null;

  protected saveFigure(): void {
    void this.figureSave.save(this.store.figure());
  }

  protected renameFromInput(event: Event): void {
    this.store.rename(inputValue(event));
  }

  protected startCanvasPointer(event: PointerEvent): void {
    const point = this.figurePoint(event);
    if (point) {
      this.store.clickCanvas(point);
    }
  }

  protected startJointPointer(event: PointerEvent, jointId: string): void {
    event.stopPropagation();
    this.store.clickJoint(jointId);

    if (this.store.tool() !== 'select') {
      return;
    }
    const point = this.figurePoint(event);
    if (!point) {
      return;
    }
    this.draggingJointId = jointId;
    this.dragMoved = false;
    this.dragStart = point;
    (event.target as Element).setPointerCapture?.(event.pointerId);
  }

  protected pickSegment(event: PointerEvent, segmentId: string): void {
    event.stopPropagation();
    this.store.clickSegment(segmentId);
  }

  protected movePointer(event: PointerEvent): void {
    const jointId = this.draggingJointId;
    const start = this.dragStart;
    if (!jointId || !start) {
      return;
    }
    const point = this.figurePoint(event);
    if (!point) {
      return;
    }
    if (!this.dragMoved) {
      if (Math.hypot(point.x - start.x, point.y - start.y) < DRAG_THRESHOLD) {
        return;
      }
      this.dragMoved = true;
      this.store.beginEdit();
    }
    this.store.dragJoint(jointId, point);
  }

  protected endPointer(event: PointerEvent): void {
    if (this.draggingJointId === null) {
      return;
    }
    (event.target as Element).releasePointerCapture?.(event.pointerId);
    if (this.dragMoved) {
      this.store.endEdit();
    }
    this.draggingJointId = null;
    this.dragStart = null;
    this.dragMoved = false;
  }

  protected changeDefaultShape(event: Event): void {
    const shape = segmentShape(inputValue(event));
    if (shape) {
      this.store.segmentStyle.update((style) => ({ ...style, shape }));
    }
  }

  protected changeDefaultWidth(event: Event): void {
    const width = positiveNumber(event);
    if (width !== null) {
      this.store.segmentStyle.update((style) => ({ ...style, width }));
    }
  }

  protected changeDefaultColor(event: Event): void {
    this.store.segmentStyle.update((style) => ({ ...style, color: inputValue(event) }));
  }

  protected changeDefaultJointRadius(event: Event): void {
    const radius = positiveNumber(event);
    if (radius !== null) {
      this.store.jointStyle.update((style) => ({ ...style, radius }));
    }
  }

  protected editJointNumber(property: 'x' | 'y' | 'radius', event: Event): void {
    const value = property === 'radius' ? positiveNumber(event) : finiteNumber(event);
    if (value !== null) {
      this.store.editJoint({ [property]: value });
    }
  }

  protected editJointColor(event: Event): void {
    this.store.editJoint({ color: inputValue(event) });
  }

  protected editSegmentShape(event: Event): void {
    const shape = segmentShape(inputValue(event));
    if (shape) {
      this.store.editSegment({ shape });
    }
  }

  protected editSegmentWidth(event: Event): void {
    const width = positiveNumber(event);
    if (width !== null) {
      this.store.editSegment({ width });
    }
  }

  protected editSegmentColor(event: Event): void {
    this.store.editSegment({ color: inputValue(event) });
  }

  protected handleShortcut(event: KeyboardEvent): void {
    if (isEditableTarget(event.target)) {
      return;
    }
    const key = event.key.toLowerCase();
    if ((event.metaKey || event.ctrlKey) && key === 'z') {
      event.preventDefault();
      if (event.shiftKey) {
        this.store.redo();
      } else {
        this.store.undo();
      }
      return;
    }
    if ((event.metaKey || event.ctrlKey) && key === 's') {
      event.preventDefault();
      this.saveFigure();
      return;
    }
    if (key === 'delete' || key === 'backspace') {
      event.preventDefault();
      this.store.deleteSelection();
      return;
    }
    if (key === 'escape') {
      event.preventDefault();
      this.closed.emit();
    }
  }

  /** Converts a pointer position into figure coordinates, which run Y-up unlike SVG. */
  private figurePoint(event: PointerEvent): DraftPoint | null {
    const svg = (event.target as Element).closest('svg');
    if (!svg) {
      return null;
    }
    const rect = svg.getBoundingClientRect();
    if (rect.width === 0 || rect.height === 0) {
      return null;
    }

    // preserveAspectRatio="xMidYMid meet" fits the square viewBox inside the element and centers it.
    const { width, height } = this.bounds();
    const scale = Math.min(rect.width / width, rect.height / height);
    const offsetX = (rect.width - width * scale) / 2;
    const offsetY = (rect.height - height * scale) / 2;
    const svgX = (event.clientX - rect.left - offsetX) / scale + this.bounds().x;
    const svgY = (event.clientY - rect.top - offsetY) / scale + this.bounds().y;
    return { x: round(svgX), y: round(-svgY) };
  }
}

function round(value: number): number {
  return Math.round(value * 100) / 100;
}

function inputValue(event: Event): string {
  return (event.target as HTMLInputElement | HTMLSelectElement).value;
}

function finiteNumber(event: Event): number | null {
  const value = Number.parseFloat(inputValue(event));
  return Number.isFinite(value) ? value : null;
}

function positiveNumber(event: Event): number | null {
  const value = finiteNumber(event);
  return value !== null && value > 0 ? value : null;
}

function segmentShape(value: string): DrawableSegmentShape | null {
  return DRAWABLE_SEGMENT_SHAPES.includes(value as DrawableSegmentShape)
    ? (value as DrawableSegmentShape)
    : null;
}
