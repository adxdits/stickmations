import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { LucideExternalLink } from '@lucide/angular';
import type { DownloadSiteConfig } from '../../download-site.config';

@Component({
  selector: 'app-feature-section',
  imports: [LucideExternalLink],
  templateUrl: './feature-section.html',
  styleUrl: './feature-section.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class FeatureSection {
  readonly config = input.required<DownloadSiteConfig>();
}
