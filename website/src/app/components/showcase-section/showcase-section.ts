import { ChangeDetectionStrategy, Component, inject, input, signal } from '@angular/core';
import { DomSanitizer, type SafeResourceUrl } from '@angular/platform-browser';
import { LucideExternalLink, LucideMail, LucidePlay } from '@lucide/angular';
import type { ShowcaseVideo, SiteShowcase } from '../../download-site.config';

const MAX_RESOLUTION_POSTER = 'maxresdefault';
const FALLBACK_POSTER = 'hqdefault';
/** Width of the grey still YouTube serves in place of a missing poster. */
const PLACEHOLDER_WIDTH = 120;

@Component({
  selector: 'app-showcase-section',
  imports: [LucideExternalLink, LucideMail, LucidePlay],
  templateUrl: './showcase-section.html',
  styleUrl: './showcase-section.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ShowcaseSection {
  readonly showcase = input.required<SiteShowcase>();
  readonly email = input.required<string>();

  private readonly sanitizer = inject(DomSanitizer);
  /** The one video swapped from its poster to a player, so YouTube loads only on request. */
  private readonly playing = signal<string | null>(null);

  isPlaying(video: ShowcaseVideo): boolean {
    return this.playing() === video.videoId;
  }

  play(video: ShowcaseVideo): void {
    this.playing.set(video.videoId);
  }

  watchUrl(video: ShowcaseVideo): string {
    return `https://www.youtube.com/watch?v=${video.videoId}`;
  }

  posterUrl(video: ShowcaseVideo): string {
    return `https://i.ytimg.com/vi/${video.videoId}/${MAX_RESOLUTION_POSTER}.jpg`;
  }

  embedUrl(video: ShowcaseVideo): SafeResourceUrl {
    return this.sanitizer.bypassSecurityTrustResourceUrl(
      `https://www.youtube-nocookie.com/embed/${video.videoId}?autoplay=1&rel=0`,
    );
  }

  submitUrl(): string {
    const subject = encodeURIComponent('Stickmations showcase submission');
    return `mailto:${this.email()}?subject=${subject}`;
  }

  /**
   * An upload without a 1280x720 still does not 404: YouTube answers with a grey 120x90
   * placeholder instead, so the poster is checked once it loads as well as on failure.
   */
  verifyPoster(event: Event): void {
    if ((event.target as HTMLImageElement).naturalWidth <= PLACEHOLDER_WIDTH) {
      this.useFallbackPoster(event);
    }
  }

  /** Falls back to the smaller still YouTube generates for every upload. */
  useFallbackPoster(event: Event): void {
    const poster = event.target as HTMLImageElement;
    if (poster.src.includes(MAX_RESOLUTION_POSTER)) {
      poster.src = poster.src.replace(MAX_RESOLUTION_POSTER, FALLBACK_POSTER);
    }
  }
}
