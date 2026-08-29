import { ChangeDetectionStrategy, Component, computed, signal } from '@angular/core';
import {
  moveJointToward,
  parseStickFigureJson,
  parseStickNodesFile,
  translateFigure,
  type StickFigure,
} from '@framation/engine';
import { createFigurePreview } from './figure-preview';

type ControlMode = 'none' | 'joints';
type DragStrategy = 'translate-figure' | 'joint';

interface DragState {
  readonly strategy: DragStrategy;
  readonly targetId?: string;
  readonly x: number;
  readonly y: number;
}

@Component({
  selector: 'app-root',
  imports: [],
  templateUrl: './app.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class App {
  protected readonly title = signal('Framation');
  protected readonly importedFigure = signal<StickFigure | null>(null);
  protected readonly importError = signal<string | null>(null);
  protected readonly controlMode = signal<ControlMode>('none');
  protected readonly previewViewBox = signal<string | null>(null);
  protected readonly preview = computed(() => {
    const figure = this.importedFigure();
    return figure ? createFigurePreview(figure) : null;
  });

  protected async importFigure(event: Event): Promise<void> {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];

    if (!file) {
      return;
    }

    try {
      const figure = file.name.toLowerCase().endsWith('.nodes')
        ? parseStickNodesFile(await file.arrayBuffer(), file.name)
        : parseStickFigureJson(await file.text());
      this.importedFigure.set(figure);
      this.importError.set(null);
      this.controlMode.set('none');
      this.previewViewBox.set(createFigurePreview(figure).viewBox);
    } catch (error: unknown) {
      this.importedFigure.set(null);
      this.previewViewBox.set(null);
      this.importError.set(
        error instanceof Error ? error.message : 'The figure could not be imported.',
      );
    }
  }

  protected selectControlMode(event: Event): void {
    this.controlMode.set((event.target as HTMLSelectElement).value as ControlMode);
    this.dragState = null;
  }

  protected startDraggingRigJoint(event: PointerEvent, jointId: string): void {
    this.startDragging(event, 'joint', jointId);
  }

  protected startDraggingFigure(event: PointerEvent): void {
    this.startDragging(event, 'translate-figure');
  }

  protected dragControl(event: PointerEvent): void {
    if (!this.dragState) {
      return;
    }

    const svg = event.currentTarget as SVGSVGElement;
    const position = this.getPointerPosition(event, svg);
    if (!position) {
      return;
    }

    const deltaX = position.x - this.dragState.x;
    const deltaY = this.dragState.y - position.y;
    const target = { x: position.x, y: -position.y };
    this.importedFigure.update((figure) => {
      if (!figure || !this.dragState) {
        return figure;
      }

      switch (this.dragState.strategy) {
        case 'translate-figure':
          return translateFigure(figure, deltaX, deltaY);
        case 'joint':
          return this.dragState.targetId
            ? moveJointToward(figure, this.dragState.targetId, target)
            : figure;
      }
    });
    this.dragState = { ...this.dragState, x: position.x, y: position.y };
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

  private dragState: DragState | null = null;

  private startDragging(event: PointerEvent, strategy: DragStrategy, targetId?: string): void {
    const element = event.currentTarget as SVGGraphicsElement;
    const svg = element.ownerSVGElement;
    const position = svg ? this.getPointerPosition(event, svg) : null;
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

    if (!offset) {
      return;
    }

    event.preventDefault();
    this.importedFigure.update((figure) => {
      if (!figure) {
        return null;
      }
      if (strategy === 'translate-figure') {
        return translateFigure(figure, offset[0], offset[1]);
      }
      if (!targetId) {
        return figure;
      }

      const joint = figure.joints.find(({ id }) => id === targetId);
      if (!joint) {
        return figure;
      }
      const target = { x: joint.x + offset[0], y: joint.y + offset[1] };
      return moveJointToward(figure, targetId, target);
    });
  }
}
