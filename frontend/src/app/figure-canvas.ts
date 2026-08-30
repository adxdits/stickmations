import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { moveJointToward, translateFigure, type StickFigure } from '@framation/engine';
import { LucideUpload } from '@lucide/angular';
import type { ControlMode } from './editor-types';
import type { FigurePreview } from './figure-preview';

type DragStrategy = 'translate-figure' | 'joint';
interface DragState {
  readonly strategy: DragStrategy;
  readonly targetId?: string;
  readonly x: number;
  readonly y: number;
}

@Component({
  selector: 'app-figure-canvas',
  imports: [LucideUpload],
  templateUrl: './figure-canvas.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class FigureCanvas {
  readonly figure = input<StickFigure | null>(null);
  readonly preview = input<FigurePreview | null>(null);
  readonly viewBox = input<string | null>(null);
  readonly controlMode = input.required<ControlMode>();
  readonly zoom = input.required<number>();
  readonly importError = input<string | null>(null);
  readonly figureChange = output<StickFigure>();
  readonly fileSelected = output<File>();
  private dragState: DragState | null = null;

  protected selectFile(event: Event): void {
    const file = (event.target as HTMLInputElement).files?.[0];
    if (file) {
      this.fileSelected.emit(file);
    }
  }
  protected startDraggingRigJoint(event: PointerEvent, jointId: string): void {
    this.startDragging(event, 'joint', jointId);
  }
  protected startDraggingFigure(event: PointerEvent): void {
    this.startDragging(event, 'translate-figure');
  }
  protected stopDraggingControl(): void {
    this.dragState = null;
  }
  protected moveRigJointWithKeyboard(event: KeyboardEvent, jointId: string): void {
    this.moveWithKeyboard(event, 'joint', jointId);
  }
  protected moveFigureWithKeyboard(event: KeyboardEvent): void {
    this.moveWithKeyboard(event, 'translate-figure');
  }

  protected dragControl(event: PointerEvent): void {
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
    if (strategy === 'translate-figure') {
      this.figureChange.emit(translateFigure(figure, offset[0], offset[1]));
      return;
    }
    const joint = figure.joints.find(({ id }) => id === targetId);
    if (joint && targetId) {
      this.figureChange.emit(
        moveJointToward(figure, targetId, { x: joint.x + offset[0], y: joint.y + offset[1] }),
      );
    }
  }
}
