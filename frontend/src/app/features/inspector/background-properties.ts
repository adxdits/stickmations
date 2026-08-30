import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { LucideX } from '@lucide/angular';
import type { BackgroundChange, BackgroundFit, SceneBackground } from '../../domain/scene-frame';
import { inputNumber } from '../../shared/dom-events';

@Component({
  selector: 'app-background-properties',
  imports: [LucideX],
  templateUrl: './background-properties.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class BackgroundProperties {
  readonly background = input<SceneBackground | null>(null);
  readonly backgroundColorChange = output<string>();
  readonly backgroundChange = output<BackgroundChange>();
  readonly backgroundReset = output<void>();
  readonly imageRemoved = output<void>();

  protected changeColor(event: Event): void {
    this.backgroundColorChange.emit((event.target as HTMLInputElement).value);
  }

  protected changeFit(event: Event): void {
    this.backgroundChange.emit({
      property: 'fit',
      value: (event.target as HTMLSelectElement).value as BackgroundFit,
    });
  }

  protected changeNumber(property: 'scale' | 'positionX' | 'positionY', event: Event): void {
    const value = inputNumber(event);
    if (value !== null) {
      this.backgroundChange.emit({ property, value });
    }
  }
}
