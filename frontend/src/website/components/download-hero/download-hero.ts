import { NgOptimizedImage } from '@angular/common';
import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import type { DownloadSiteConfig } from '../../download-site.config';

@Component({
  selector: 'app-download-hero',
  imports: [NgOptimizedImage],
  templateUrl: './download-hero.html',
  styleUrl: './download-hero.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DownloadHero {
  readonly config = input.required<DownloadSiteConfig>();
}
