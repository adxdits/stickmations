import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import {
  LucideBug,
  LucideCoffee,
  LucideExternalLink,
  LucideMessageCircle,
  LucideMessagesSquare,
} from '@lucide/angular';
import type { CreatorProfile } from '../../download-site.config';

@Component({
  selector: 'app-about-creator',
  imports: [
    LucideBug,
    LucideCoffee,
    LucideExternalLink,
    LucideMessageCircle,
    LucideMessagesSquare,
  ],
  templateUrl: './about-creator.html',
  styleUrl: './about-creator.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AboutCreatorComponent {
  readonly creator = input.required<CreatorProfile>();
}
