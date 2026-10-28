import { TestBed } from '@angular/core/testing';
import { describe, expect, it } from 'vitest';
import { DownloadSite } from './download-site';

describe('DownloadSite', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [DownloadSite],
    }).compileComponents();
  });

  it('presents the normal download and upcoming Pro release without pricing', async () => {
    const fixture = TestBed.createComponent(DownloadSite);
    await fixture.whenStable();
    const root = fixture.nativeElement as HTMLElement;
    const downloads = [
      ...root.querySelectorAll<HTMLAnchorElement>('.download-button'),
    ];

    expect(root.querySelector('h1')?.textContent).toContain('Stickmations');
    const news = root.querySelector<HTMLElement>('#news');
    expect(news?.textContent).toContain("What's new");
    expect(news?.textContent).toContain(
      'Every older Stick Nodes figure now imports',
    );
    expect(news?.querySelector('time')?.getAttribute('datetime')).toBe(
      '2026-09-06',
    );
    expect(
      root.querySelector<HTMLAnchorElement>('.release-heading a')?.href,
    ).toBe(
      'https://github.com/adxdits/stickmations/releases/tag/v0.1.6',
    );
    expect(downloads.map(({ href }) => href)).toEqual([
      'https://github.com/adxdits/stickmations/releases/download/v0.1.6/Stickmations-0.1.6-windows-x64-setup.exe',
      'https://github.com/adxdits/stickmations/releases/download/v0.1.6/Stickmations-0.1.6-windows-x64-portable.exe',
      'https://github.com/adxdits/stickmations/releases/download/v0.1.6/Stickmations-0.1.6-mac-arm64.dmg',
      'https://github.com/adxdits/stickmations/releases/download/v0.1.6/Stickmations-0.1.6-mac-arm64.zip',
      'https://github.com/adxdits/stickmations/releases/download/v0.1.6/Stickmations-0.1.6-mac-x64.dmg',
      'https://github.com/adxdits/stickmations/releases/download/v0.1.6/Stickmations-0.1.6-mac-x64.zip',
      'https://github.com/adxdits/stickmations/releases/download/v0.1.6/Stickmations-0.1.6-linux-x86_64.AppImage',
      'https://github.com/adxdits/stickmations/releases/download/v0.1.6/Stickmations-0.1.6-linux-amd64.deb',
    ]);
    expect(
      [...root.querySelectorAll<HTMLElement>('.platform-release h3')].map(
        ({ textContent }) => textContent,
      ),
    ).toEqual(['Windows', 'macOS', 'Linux']);
    expect(root.querySelector('.pro-release')?.textContent).toContain(
      'Release soon',
    );
    expect(root.querySelector('.download-button strong')?.textContent).toBe(
      'Install',
    );
    expect(root.querySelector('.release-links')).toBeNull();
    expect(root.textContent).not.toContain('SHA-256 checksums');
    expect(root.textContent).not.toContain('Unsigned preview release');
    expect(root.querySelector('.edition-price')).toBeNull();
    expect(root.textContent).not.toContain('Lite');
    expect(root.textContent).not.toContain('$4.99');
    expect(root.textContent).toContain(
      'Stickmations imports stick figures from .nodes files.',
    );
    expect(root.querySelector('img[src*="editor_preview.webp"]')).toBeTruthy();

    expect(root.querySelector('#features-title')?.textContent).toBe('Features');
    expect(root.querySelector('#about-title')?.textContent).toBe('About');

    const resources = [
      ...root.querySelectorAll<HTMLAnchorElement>('.resource-link'),
    ];
    expect(resources.map(({ href }) => href)).toEqual([
      'https://sticknodes.com/stickfigures/',
      'https://pivotanimator.net/stk-library',
    ]);
    expect(root.textContent).toContain(
      'Pivot .stk import is not supported yet.',
    );

    const communityLinks = [
      ...root.querySelectorAll<HTMLAnchorElement>('.community-links a'),
    ];
    expect(communityLinks.map(({ href }) => href)).toEqual([
      'https://discord.gg/5YQTaaC5W',
      'https://www.reddit.com/r/StickmationsOfficial/',
      'https://buymeacoffee.com/adxdits',
      'mailto:adamalmounayar@hotmail.com?subject=Stickmations%20contact%20or%20bug%20report',
    ]);
    expect(communityLinks.map(({ textContent }) => textContent)).toEqual([
      expect.stringContaining('Join Discord'),
      expect.stringContaining('Reddit community'),
      expect.stringContaining('Support development'),
      expect.stringContaining('Contact or report a bug'),
    ]);

    expect(
      root.querySelector<HTMLAnchorElement>('a[href*="linkedin.com"]')?.href,
    ).toBe('https://www.linkedin.com/in/adam-al-mounayar-0b6a5026b/');
    expect(
      root.querySelector<HTMLAnchorElement>(
        'a[href="https://github.com/adxdits"]',
      ),
    ).toBeTruthy();
    expect(root.textContent).toContain('adamalmounayar@hotmail.com');
  });

  it('shows the showcase videos behind posters and explains how to be featured', async () => {
    const fixture = TestBed.createComponent(DownloadSite);
    await fixture.whenStable();
    const root = fixture.nativeElement as HTMLElement;
    const showcase = root.querySelector<HTMLElement>('#showcase');

    expect(root.querySelector('#showcase-title')?.textContent).toBe('Showcase');
    expect(
      [...root.querySelectorAll<HTMLElement>('.video-copy strong')].map(
        ({ textContent }) => textContent,
      ),
    ).toEqual([
      'First walking animation using Stickmations',
      'Our new software beating Stick Nodes',
    ]);
    expect(
      [...root.querySelectorAll<HTMLAnchorElement>('.watch-link')].map(
        ({ href }) => href,
      ),
    ).toEqual([
      'https://www.youtube.com/watch?v=L_wu_oimzKE',
      'https://www.youtube.com/watch?v=HkSqb0QL8sk',
    ]);
    expect(showcase?.textContent).toContain('Adam Almounayar');

    // YouTube is only contacted once a viewer asks for a video.
    expect(root.querySelectorAll('.video-poster')).toHaveLength(2);
    expect(root.querySelector('iframe')).toBeNull();

    // A missing 1280x720 still arrives as a decodable placeholder, so the poster is
    // re-checked on load rather than waiting for an error that never fires.
    const poster = root.querySelector<HTMLImageElement>('.video-poster img');
    expect(poster?.src).toContain('maxresdefault.jpg');
    poster?.dispatchEvent(new Event('load'));
    expect(poster?.src).toContain('hqdefault.jpg');

    root.querySelector<HTMLButtonElement>('.video-poster')?.click();
    await fixture.whenStable();

    const player = root.querySelector<HTMLIFrameElement>('iframe');
    expect(player?.src).toContain('/embed/L_wu_oimzKE');
    expect(root.querySelectorAll('.video-poster')).toHaveLength(1);

    expect(showcase?.textContent).toContain(
      'mention Stickmations in the title or',
    );
    expect(
      [...root.querySelectorAll<HTMLAnchorElement>('.submission-link')].map(
        ({ href }) => href,
      ),
    ).toEqual([
      'mailto:adamalmounayar@hotmail.com?subject=Stickmations%20showcase%20submission',
      'https://www.youtube.com/@StickmationsSoftware',
    ]);
  });
});
