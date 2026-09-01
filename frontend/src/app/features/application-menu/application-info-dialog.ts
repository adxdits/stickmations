import { NgOptimizedImage } from '@angular/common';
import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import {
  LucideBug,
  LucideCircleHelp,
  LucideCoffee,
  LucideExternalLink,
  LucideGlobe,
  LucideInfo,
  LucideMessageCircle,
  LucideMessagesSquare,
  LucideX,
} from '@lucide/angular';
import { SUPPORT_LINKS } from '../../shared/support-links';

export type ApplicationInfoView = 'help' | 'about';

@Component({
  selector: 'app-application-info-dialog',
  imports: [
    NgOptimizedImage,
    LucideBug,
    LucideCircleHelp,
    LucideCoffee,
    LucideExternalLink,
    LucideGlobe,
    LucideInfo,
    LucideMessageCircle,
    LucideMessagesSquare,
    LucideX,
  ],
  templateUrl: './application-info-dialog.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ApplicationInfoDialog {
  readonly view = input.required<ApplicationInfoView>();
  readonly closed = output<void>();
  protected readonly links = SUPPORT_LINKS;
}
