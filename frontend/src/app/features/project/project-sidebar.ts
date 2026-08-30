import { ChangeDetectionStrategy, Component, input, output, signal } from '@angular/core';
import {
  LucideArrowDown,
  LucideArrowUp,
  LucideChevronRight,
  LucideEye,
  LucideEyeOff,
  LucideFilePlusCorner,
  LucideFolderOpen,
  LucideGripVertical,
  LucideImage,
  LucideMusic2,
  LucidePersonStanding,
  LucidePlus,
  LucideSearch,
  LucideTrash2,
  LucideUpload,
} from '@lucide/angular';
import type { FigureLayer, LayerMove, SceneBackground } from '../../domain/scene-frame';

export interface FigureVisibilityChange {
  readonly id: string;
  readonly visible: boolean;
}

@Component({
  selector: 'app-project-sidebar',
  imports: [
    LucideArrowDown,
    LucideArrowUp,
    LucideChevronRight,
    LucideEye,
    LucideFilePlusCorner,
    LucideFolderOpen,
    LucideGripVertical,
    LucideImage,
    LucideEyeOff,
    LucideMusic2,
    LucidePersonStanding,
    LucidePlus,
    LucideSearch,
    LucideTrash2,
    LucideUpload,
  ],
  templateUrl: './project-sidebar.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ProjectSidebar {
  readonly figures = input<readonly FigureLayer[]>([]);
  readonly selectedFigureId = input<string | null>(null);
  readonly background = input<SceneBackground | null>(null);
  readonly filesSelected = output<readonly File[]>();
  readonly backgroundFileSelected = output<File>();
  readonly blankProjectRequested = output<void>();
  readonly figureSelected = output<string>();
  readonly figureDeleted = output<string>();
  readonly figureVisibilityChanged = output<FigureVisibilityChange>();
  readonly figureMoved = output<LayerMove>();
  protected readonly draggedFigureId = signal<string | null>(null);
  protected readonly dropTargetIndex = signal<number | null>(null);

  protected selectFile(event: Event): void {
    const input = event.target as HTMLInputElement;
    const files = Array.from(input.files ?? []);
    if (files.length > 0) {
      this.filesSelected.emit(files);
    }
    input.value = '';
  }

  protected selectBackgroundFile(event: Event): void {
    const file = (event.target as HTMLInputElement).files?.[0];
    if (file) {
      this.backgroundFileSelected.emit(file);
    }
  }

  protected startFigureDrag(event: DragEvent, layerId: string): void {
    this.draggedFigureId.set(layerId);
    event.dataTransfer?.setData('application/x-framation-layer', layerId);
    event.dataTransfer?.setData('text/plain', layerId);
    if (event.dataTransfer) {
      event.dataTransfer.effectAllowed = 'move';
    }
  }

  protected allowFigureDrop(event: DragEvent, toIndex: number): void {
    event.preventDefault();
    this.dropTargetIndex.set(toIndex);
    if (event.dataTransfer) {
      event.dataTransfer.dropEffect = 'move';
    }
  }

  protected dropFigure(event: DragEvent, toIndex: number): void {
    event.preventDefault();
    const layerId =
      this.draggedFigureId() ??
      event.dataTransfer?.getData('application/x-framation-layer') ??
      event.dataTransfer?.getData('text/plain');
    if (layerId) {
      this.figureMoved.emit({ layerId, toIndex });
    }
    this.endFigureDrag();
  }

  protected endFigureDrag(): void {
    this.draggedFigureId.set(null);
    this.dropTargetIndex.set(null);
  }
}
