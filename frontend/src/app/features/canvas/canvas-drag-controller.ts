import { moveJointToward, translateFigure, type StickFigure } from '@stickmations/engine';
import type { CameraChange, SceneCamera } from '../../domain/scene-frame';
import type { PanOffset } from '../../shared/editor-types';

export type FigureDragStrategy = 'translate-figure' | 'joint';
export type CameraDragStrategy = 'move' | 'resize' | 'rotate';
export interface CanvasPoint {
  readonly x: number;
  readonly y: number;
}

interface FigureDragState extends CanvasPoint {
  readonly strategy: FigureDragStrategy;
  readonly targetId?: string;
}

interface PanDragState {
  readonly pointerX: number;
  readonly pointerY: number;
  readonly panX: number;
  readonly panY: number;
  readonly unitsPerPixel: number;
}

interface CameraDragState {
  readonly strategy: CameraDragStrategy;
  readonly pointer: CanvasPoint;
  readonly camera: SceneCamera;
}

export class CanvasDragController {
  private figureDrag: FigureDragState | null = null;
  private panDrag: PanDragState | null = null;
  private cameraDrag: CameraDragState | null = null;

  get isPanning(): boolean {
    return this.panDrag !== null;
  }

  startFigure(strategy: FigureDragStrategy, point: CanvasPoint, targetId?: string): void {
    this.figureDrag = { strategy, targetId, x: point.x, y: point.y };
  }

  startPan(pointer: CanvasPoint, pan: PanOffset, unitsPerPixel: number): void {
    this.panDrag = {
      pointerX: pointer.x,
      pointerY: pointer.y,
      panX: pan.x,
      panY: pan.y,
      unitsPerPixel,
    };
  }

  startCamera(strategy: CameraDragStrategy, pointer: CanvasPoint, camera: SceneCamera): void {
    this.cameraDrag = { strategy, pointer, camera };
  }

  movePan(pointer: CanvasPoint): PanOffset | null {
    const drag = this.panDrag;
    return drag
      ? {
          x: drag.panX + (pointer.x - drag.pointerX) * drag.unitsPerPixel,
          y: drag.panY + (pointer.y - drag.pointerY) * drag.unitsPerPixel,
        }
      : null;
  }

  moveFigure(figure: StickFigure, point: CanvasPoint): StickFigure | null {
    const drag = this.figureDrag;
    if (!drag) {
      return null;
    }

    let moved = figure;
    if (drag.strategy === 'translate-figure') {
      moved = translateFigure(figure, point.x - drag.x, drag.y - point.y);
    } else if (drag.targetId) {
      moved = moveJointToward(figure, drag.targetId, { x: point.x, y: -point.y });
    }
    this.figureDrag = { ...drag, x: point.x, y: point.y };
    return moved;
  }

  moveCamera(point: CanvasPoint): readonly CameraChange[] | null {
    const drag = this.cameraDrag;
    if (!drag) {
      return null;
    }

    const deltaX = point.x - drag.pointer.x;
    const deltaY = point.y - drag.pointer.y;
    if (drag.strategy === 'move') {
      return [
        { property: 'positionX', value: drag.camera.positionX + deltaX },
        { property: 'positionY', value: drag.camera.positionY + deltaY },
      ];
    }
    if (drag.strategy === 'rotate') {
      const angle =
        (Math.atan2(point.y - drag.camera.positionY, point.x - drag.camera.positionX) * 180) /
          Math.PI +
        90;
      return [{ property: 'rotation', value: angle }];
    }

    const radians = (drag.camera.rotation * Math.PI) / 180;
    const localX = deltaX * Math.cos(radians) + deltaY * Math.sin(radians);
    const localY = -deltaX * Math.sin(radians) + deltaY * Math.cos(radians);
    return [
      { property: 'width', value: Math.max(32, drag.camera.width + localX * 2) },
      { property: 'height', value: Math.max(18, drag.camera.height + localY * 2) },
    ];
  }

  clear(): boolean {
    const editedDocument = this.figureDrag !== null || this.cameraDrag !== null;
    this.figureDrag = null;
    this.panDrag = null;
    this.cameraDrag = null;
    return editedDocument;
  }
}
