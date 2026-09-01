import { NgOptimizedImage } from '@angular/common';
import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { LucideArrowDownToLine } from '@lucide/angular';
import type { DownloadSiteConfig } from '../../download-site.config';

@Component({
  selector: 'app-site-header',
  imports: [NgOptimizedImage, LucideArrowDownToLine],
  templateUrl: './site-header.html',
  styleUrl: './site-header.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SiteHeader {
  readonly config = input.required<DownloadSiteConfig>();
}
