import { TestBed } from '@angular/core/testing';
import { describe, expect, it } from 'vitest';
import { DownloadSite } from './download-site';

describe('DownloadSite', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({ imports: [DownloadSite] }).compileComponents();
  });

  it('presents simple Lite and Premium downloads with the saving difference', async () => {
    const fixture = TestBed.createComponent(DownloadSite);
    await fixture.whenStable();
    const root = fixture.nativeElement as HTMLElement;
    const downloads = root.querySelectorAll<HTMLButtonElement>('.download-button');

    expect(root.querySelector('h1')?.textContent).toContain('Stickmations');
    expect(downloads).toHaveLength(2);
    expect([...downloads].map(({ textContent }) => textContent?.trim())).toEqual([
      'Download Lite',
      'Download Premium',
    ]);
    expect([...downloads].every(({ disabled }) => disabled)).toBe(true);
    const editions = [...root.querySelectorAll<HTMLElement>('.editions article')];
    expect(editions[0]?.querySelector('.edition-price strong')?.textContent).toBe('Free');
    expect(editions[1]?.querySelector('.edition-price strong')?.textContent).toBe('$4.99');
    expect(editions[1]?.querySelector('.edition-price span')?.textContent).toBe('per month');
    expect(editions[0]?.querySelector('.edition-copy .edition-warning')?.textContent).toContain(
      'Cannot save projects',
    );
    expect(editions[1]?.querySelector('.edition-warning')).toBeNull();
    expect(root.textContent).toContain('Both editions import stick figures from .nodes files.');
    expect(root.querySelector('img[src*="editor_preview.webp"]')).toBeTruthy();

    const resources = [...root.querySelectorAll<HTMLAnchorElement>('.resource-link')];
    expect(resources.map(({ href }) => href)).toEqual([
      'https://sticknodes.com/stickfigures/',
      'https://pivotanimator.net/stk-library',
    ]);
    expect(root.textContent).toContain('Pivot .stk import is not supported yet.');

    expect(root.querySelector<HTMLAnchorElement>('a[href*="linkedin.com"]')?.href).toBe(
      'https://www.linkedin.com/in/adam-al-mounayar-0b6a5026b/',
    );
    expect(
      root.querySelector<HTMLAnchorElement>('a[href="https://github.com/adxdits"]'),
    ).toBeTruthy();
    expect(root.querySelector<HTMLAnchorElement>('a[href^="mailto:"]')?.href).toBe(
      'mailto:adamalmounayar@hotmail.com',
    );
  });
});
