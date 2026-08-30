import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import type { StickFigure } from '@framation/engine';
import {
  LucideChevronRight,
  LucideEye,
  LucideFolderOpen,
  LucideMusic2,
  LucidePersonStanding,
  LucidePlus,
  LucideSearch,
} from '@lucide/angular';

@Component({
  selector: 'app-project-sidebar',
  imports: [
    LucideChevronRight,
    LucideEye,
    LucideFolderOpen,
    LucideMusic2,
    LucidePersonStanding,
    LucidePlus,
    LucideSearch,
  ],
  templateUrl: './project-sidebar.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ProjectSidebar {
  readonly figure = input<StickFigure | null>(null);
  readonly fileSelected = output<File>();

  protected selectFile(event: Event): void {
    const file = (event.target as HTMLInputElement).files?.[0];
    if (file) {
      this.fileSelected.emit(file);
    }
  }
}
