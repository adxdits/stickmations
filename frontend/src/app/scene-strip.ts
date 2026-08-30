import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { LucidePlus } from '@lucide/angular';
import type { FigurePreview } from './figure-preview';

@Component({
  selector: 'app-scene-strip',
  imports: [LucidePlus],
  templateUrl: './scene-strip.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SceneStrip {
  readonly preview = input<FigurePreview | null>(null);
  readonly currentFrame = input.required<number>();
  readonly frameSelected = output<number>();
  protected readonly frames = Array.from({ length: 8 }, (_, index) => index + 1);
}
