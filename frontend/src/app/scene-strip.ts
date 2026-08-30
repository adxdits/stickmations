import { ChangeDetectionStrategy, Component, input, output, signal } from '@angular/core';
import {
  LucideChevronLeft,
  LucideChevronRight,
  LucideFilePlusCorner,
  LucideGripVertical,
  LucidePlus,
  LucideTrash2,
} from '@lucide/angular';
import type { FrameMove } from './editor-history';
import type { FigurePreview } from './figure-preview';
import type { SceneBackground } from './scene-frame';

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
  readonly currentFrame = input.required<number>();
  readonly frameSelected = output<number>();
  readonly frameAdded = output<void>();
  readonly blankFrameAdded = output<void>();
  readonly frameDeleted = output<void>();
  readonly frameMoved = output<FrameMove>();
  readonly previousFrame = output<void>();
  readonly nextFrame = output<void>();
  protected readonly draggedFrame = signal<number | null>(null);

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
