import { ChangeDetectionStrategy, Component, input, output, signal } from '@angular/core';
import {
  LucideChevronLeft,
  LucideChevronRight,
  LucideFilePlusCorner,
  LucideGripVertical,
  LucidePlus,
  LucideTrash2,
} from '@lucide/angular';
import type { FrameMove } from '../../domain/editor-history';
import type { SceneBackground, SceneCamera } from '../../domain/scene-frame';
import type { FigurePreview } from '../../rendering/figure-preview';
import { cameraSceneTransform, cameraViewBox } from '../../shared/view-box';

@Component({
  selector: 'app-scene-strip',
  imports: [
    LucideChevronLeft,
    LucideChevronRight,
    LucideFilePlusCorner,
    LucideGripVertical,
    LucidePlus,
    LucideTrash2,
  ],
  templateUrl: './scene-strip.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SceneStrip {
  readonly previews = input<readonly FigurePreview[]>([]);
  readonly backgrounds = input<readonly SceneBackground[]>([]);
  readonly cameras = input<readonly SceneCamera[]>([]);
  readonly currentFrame = input.required<number>();
  readonly frameSelected = output<number>();
  readonly frameAdded = output<void>();
  readonly blankFrameAdded = output<void>();
  readonly frameDeleted = output<void>();
  readonly frameMoved = output<FrameMove>();
  readonly previousFrame = output<void>();
  readonly nextFrame = output<void>();
  protected readonly draggedFrame = signal<number | null>(null);

  protected readonly cameraViewBox = cameraViewBox;
  protected readonly cameraTransform = cameraSceneTransform;

  protected startFrameDrag(event: DragEvent, frameIndex: number): void {
    this.draggedFrame.set(frameIndex);
    event.dataTransfer?.setData('text/plain', String(frameIndex));
    if (event.dataTransfer) {
      event.dataTransfer.effectAllowed = 'move';
    }
  }

  protected allowFrameDrop(event: DragEvent): void {
    event.preventDefault();
    if (event.dataTransfer) {
      event.dataTransfer.dropEffect = 'move';
    }
  }

  protected dropFrame(event: DragEvent, targetIndex: number): void {
    event.preventDefault();
    const sourceIndex = this.draggedFrame();
    if (sourceIndex !== null && sourceIndex !== targetIndex) {
      this.frameMoved.emit({ from: sourceIndex, to: targetIndex });
    }
    this.draggedFrame.set(null);
  }
}
