import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';
import { LucideCircleCheck, LucideFilm, LucideTriangleAlert, LucideX } from '@lucide/angular';
import type { Mp4ExportState } from '../../io/mp4-export';

@Component({
  selector: 'app-mp4-export-dialog',
  imports: [LucideCircleCheck, LucideFilm, LucideTriangleAlert, LucideX],
  templateUrl: './mp4-export-dialog.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Mp4ExportDialog {
  readonly state = input.required<Mp4ExportState>();
  readonly fps = input.required<number>();
  readonly cancelRequested = output<void>();
  readonly dismissRequested = output<void>();
  protected readonly progress = computed(() => {
    const state = this.state();
    return state.totalFrames > 0 ? Math.round((state.renderedFrames / state.totalFrames) * 100) : 0;
  });
  protected readonly status = computed(() => {
    const state = this.state();
    switch (state.phase) {
      case 'preparing':
        return 'Choose where to save your video';
      case 'rendering':
        return `Rendering frame ${Math.min(state.renderedFrames + 1, state.totalFrames)} of ${state.totalFrames}`;
      case 'encoding':
        return 'Encoding high-quality MP4';
      case 'complete':
        return 'Export complete';
      case 'error':
        return 'Export failed';
      case 'idle':
        return '';
    }
  });
}
