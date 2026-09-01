import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { LucideExternalLink, LucideMail } from '@lucide/angular';
import type { CreatorProfile } from '../../download-site.config';

@Component({
  selector: 'app-about-creator',
  imports: [LucideExternalLink, LucideMail],
  templateUrl: './about-creator.html',
  styleUrl: './about-creator.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AboutCreatorComponent {
  readonly creator = input.required<CreatorProfile>();
}
