import { NgOptimizedImage } from '@angular/common';
import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { LucideDownload, LucideTriangleAlert } from '@lucide/angular';
import type { DownloadSiteConfig } from '../../download-site.config';

@Component({
  selector: 'app-release-section',
  imports: [NgOptimizedImage, LucideDownload, LucideTriangleAlert],
  templateUrl: './release-section.html',
  styleUrl: './release-section.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ReleaseSection {
  readonly config = input.required<DownloadSiteConfig>();
}
