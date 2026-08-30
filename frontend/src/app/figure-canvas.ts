import { ChangeDetectionStrategy, Component, computed, input, output, signal } from '@angular/core';
import { moveJointToward, translateFigure, type StickFigure } from '@framation/engine';
import { LucideFilePlusCorner, LucideUpload } from '@lucide/angular';
import type { ControlMode, PanOffset } from './editor-types';
import type { FigurePreview } from './figure-preview';
import { DEFAULT_BACKGROUND, type SceneBackground } from './scene-frame';

type DragStrategy = 'translate-figure' | 'joint';
interface DragState {
  readonly strategy: DragStrategy;
  readonly targetId?: string;
  readonly x: number;
  readonly y: number;
}

interface PanDragState {
  readonly pointerX: number;
  readonly pointerY: number;
  readonly panX: number;
  readonly panY: number;
  readonly unitsPerPixel: number;
}

@Component({
  selector: 'app-figure-canvas',
  imports: [LucideFilePlusCorner, LucideUpload],
  templateUrl: './figure-canvas.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class FigureCanvas {
  readonly figure = input<StickFigure | null>(null);
  readonly preview = input<FigurePreview | null>(null);
  readonly selectedPreview = input<FigurePreview | null>(null);
  readonly viewBox = input<string | null>(null);
  readonly hasFrame = input(false);
  readonly background = input<SceneBackground>(DEFAULT_BACKGROUND);
  readonly controlMode = input.required<ControlMode>();
  readonly zoom = input.required<number>();
  readonly pan = input.required<PanOffset>();
  readonly importError = input<string | null>(null);
  readonly figureChange = output<StickFigure>();
  readonly filesSelected = output<readonly File[]>();
  readonly blankProjectRequested = output<void>();
  readonly editStarted = output<void>();
  readonly editEnded = output<void>();
  readonly panChange = output<PanOffset>();
  protected readonly isPanning = signal(false);
  protected readonly cameraViewBox = computed(() => {
    const viewBox = parseViewBox(this.viewBox());
    const zoomScale = 100 / this.zoom();
    const width = viewBox.width * zoomScale;
    const height = viewBox.height * zoomScale;
    const pan = this.pan();
    return [
      viewBox.x + (viewBox.width - width) / 2 - pan.x,
      viewBox.y + (viewBox.height - height) / 2 - pan.y,
      width,
      height,
    ].join(' ');
  });
  private dragState: DragState | null = null;
  private panDragState: PanDragState | null = null;

  protected selectFile(event: Event): void {
    const input = event.target as HTMLInputElement;
    const files = Array.from(input.files ?? []);
    if (files.length > 0) {
      this.filesSelected.emit(files);
    }
    input.value = '';
  }
  protected startDraggingRigJoint(event: PointerEvent, jointId: string): void {
    this.startDragging(event, 'joint', jointId);
  }
  protected startDraggingFigure(event: PointerEvent): void {
    this.startDragging(event, 'translate-figure');
  }
  protected stopDraggingControl(): void {
    if (this.dragState) {
      this.editEnded.emit();
    }
    this.dragState = null;
    this.panDragState = null;
    this.isPanning.set(false);
  }
  protected moveRigJointWithKeyboard(event: KeyboardEvent, jointId: string): void {
    this.moveWithKeyboard(event, 'joint', jointId);
  }
  protected moveFigureWithKeyboard(event: KeyboardEvent): void {
    this.moveWithKeyboard(event, 'translate-figure');
  }

  protected dragControl(event: PointerEvent): void {
    if (this.panDragState) {
      this.panChange.emit({
        x:
          this.panDragState.panX +
          (event.clientX - this.panDragState.pointerX) * this.panDragState.unitsPerPixel,
        y:
          this.panDragState.panY +
          (event.clientY - this.panDragState.pointerY) * this.panDragState.unitsPerPixel,
      });
      return;
    }

    const figure = this.figure();
    if (!figure || !this.dragState) {
      return;
    }
    const position = this.getPointerPosition(event, event.currentTarget as SVGSVGElement);
    if (!position) {
      return;
    }
    const target = { x: position.x, y: -position.y };
    let moved = figure;
    if (this.dragState.strategy === 'translate-figure') {
      moved = translateFigure(figure, position.x - this.dragState.x, this.dragState.y - position.y);
    } else if (this.dragState.targetId) {
      moved = moveJointToward(figure, this.dragState.targetId, target);
    }
    this.figureChange.emit(moved);
    this.dragState = { ...this.dragState, x: position.x, y: position.y };
  }

  protected startPanning(event: PointerEvent): void {
    if (this.controlMode() !== 'pan') {
      return;
    }

    const svg = event.currentTarget as SVGSVGElement;
    const pan = this.pan();
    const bounds = svg.getBoundingClientRect();
    const camera = parseViewBox(this.cameraViewBox());
    const unitsPerPixel =
      bounds.width > 0 && bounds.height > 0
        ? Math.max(camera.width / bounds.width, camera.height / bounds.height)
        : 1;
    svg.setPointerCapture(event.pointerId);
    this.panDragState = {
      pointerX: event.clientX,
      pointerY: event.clientY,
      panX: pan.x,
      panY: pan.y,
      unitsPerPixel,
    };
    this.isPanning.set(true);
    event.preventDefault();
  }

  private startDragging(event: PointerEvent, strategy: DragStrategy, targetId?: string): void {
    const element = event.currentTarget as SVGGraphicsElement;
    const position = element.ownerSVGElement
      ? this.getPointerPosition(event, element.ownerSVGElement)
      : null;
    if (!position) {
      return;
    }
    element.setPointerCapture(event.pointerId);
    this.dragState = { strategy, targetId, x: position.x, y: position.y };
    this.editStarted.emit();
    event.preventDefault();
  }

  private getPointerPosition(
    event: PointerEvent,
    svg: SVGSVGElement,
  ): Readonly<{ x: number; y: number }> | null {
    const matrix = svg.getScreenCTM();
    if (!matrix) {
      return null;
    }
    const point = svg.createSVGPoint();
    point.x = event.clientX;
    point.y = event.clientY;
    return point.matrixTransform(matrix.inverse());
  }

  private moveWithKeyboard(event: KeyboardEvent, strategy: DragStrategy, targetId?: string): void {
    const offsets: Readonly<Record<string, readonly [number, number]>> = {
      ArrowLeft: [-5, 0],
      ArrowRight: [5, 0],
      ArrowUp: [0, 5],
      ArrowDown: [0, -5],
    };
    const offset = offsets[event.key];
    const figure = this.figure();
    if (!offset || !figure) {
      return;
    }
    event.preventDefault();
    this.editStarted.emit();
    if (strategy === 'translate-figure') {
      this.figureChange.emit(translateFigure(figure, offset[0], offset[1]));
      this.editEnded.emit();
      return;
    }
    const joint = figure.joints.find(({ id }) => id === targetId);
    if (joint && targetId) {
      this.figureChange.emit(
        moveJointToward(figure, targetId, { x: joint.x + offset[0], y: joint.y + offset[1] }),
      );
    }
    this.editEnded.emit();
  }
}

function parseViewBox(value: string | null): Readonly<{
  x: number;
  y: number;
  width: number;
  height: number;
}> {
  const values = (value ?? '-320 -180 640 360').split(/\s+/).map(Number);
  const [x, y, width, height] = values;
  if ([x, y, width, height].every(Number.isFinite) && width! > 0 && height! > 0) {
    return { x: x!, y: y!, width: width!, height: height! };
  }
  return { x: -320, y: -180, width: 640, height: 360 };
}
