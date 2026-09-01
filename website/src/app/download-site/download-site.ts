import { ChangeDetectionStrategy, Component } from '@angular/core';
import { AboutCreatorComponent } from '../components/about-creator/about-creator.component';
import { DownloadHero } from '../components/download-hero/download-hero';
import { FeatureSection } from '../components/feature-section/feature-section';
import { NewsBar } from '../components/news-bar/news-bar';
import { ReleaseSection } from '../components/release-section/release-section';
import { SiteHeader } from '../components/site-header/site-header';
import { DOWNLOAD_SITE_CONFIG } from '../download-site.config';

@Component({
  selector: 'app-root',
  imports: [
    SiteHeader,
    NewsBar,
    DownloadHero,
    ReleaseSection,
    FeatureSection,
    AboutCreatorComponent,
  ],
  templateUrl: './download-site.html',
  styleUrl: './download-site.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DownloadSite {
  protected readonly config = DOWNLOAD_SITE_CONFIG;
}
