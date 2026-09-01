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
    const downloads =
      root.querySelectorAll<HTMLButtonElement>('.download-button');

    expect(root.querySelector('h1')?.textContent).toContain('Stickmations');
    const news = root.querySelector<HTMLElement>('#news');
    expect(news?.textContent).toContain("What's new");
    expect(news?.textContent).toContain(
      'Project save and import are now available',
    );
    expect(news?.querySelector('time')?.getAttribute('datetime')).toBe(
      '2026-09-01',
    );
    expect(downloads).toHaveLength(2);
    expect(
      [...downloads].map(({ textContent }) => textContent?.trim()),
    ).toEqual(['Download', 'Download Pro']);
    expect([...downloads].every(({ disabled }) => disabled)).toBe(true);
    const editions = [
      ...root.querySelectorAll<HTMLElement>('.editions article'),
    ];
    expect(editions.map(({ textContent }) => textContent)).toEqual([
      expect.stringContaining('Stickmations'),
      expect.stringContaining('Pro'),
    ]);
    expect(editions[0]?.textContent).toContain('Download link coming soon');
    expect(editions[1]?.textContent).toContain('Release soon');
    expect(root.querySelector('.edition-price')).toBeNull();
    expect(root.textContent).not.toContain('Lite');
    expect(root.textContent).not.toContain('$4.99');
    expect(root.textContent).toContain(
      'Both editions import stick figures from .nodes files.',
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
});
