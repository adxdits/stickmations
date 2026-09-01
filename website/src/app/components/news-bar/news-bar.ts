import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { LucideNewspaper } from '@lucide/angular';
import type { SiteNews } from '../../download-site.config';

@Component({
  selector: 'app-news-bar',
  imports: [LucideNewspaper],
  templateUrl: './news-bar.html',
  styleUrl: './news-bar.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class NewsBar {
  readonly news = input.required<SiteNews>();
}
