import { TestBed } from '@angular/core/testing';
import { vi } from 'vitest';
import { App } from './app';
import { VIDEO_FRAME_RENDERER } from './io/mp4-export';
import { getEditor, menu } from './testing/app-test-harness';

describe('App MP4 export', () => {
  const startMp4Export = vi.fn();
  const writeMp4Frame = vi.fn();
  const completeMp4Export = vi.fn();
  const cancelMp4Export = vi.fn();

  beforeEach(async () => {
    startMp4Export.mockResolvedValue({ status: 'ready', sessionId: 'session-1' });
    writeMp4Frame.mockResolvedValue(undefined);
    completeMp4Export.mockResolvedValue({ path: '/Users/test/Untitled animation.mp4' });
    cancelMp4Export.mockResolvedValue(undefined);
    window.framationDesktop = {
      startMp4Export,
      writeMp4Frame,
      completeMp4Export,
      cancelMp4Export,
    };
    await TestBed.configureTestingModule({
      imports: [App],
      providers: [
        {
          provide: VIDEO_FRAME_RENDERER,
          useValue: vi.fn().mockResolvedValue(new Uint8Array([137, 80, 78, 71])),
        },
      ],
    }).compileComponents();
  });

  afterEach(() => {
    delete window.framationDesktop;
    TestBed.resetTestingModule();
    vi.clearAllMocks();
  });

  it('exports the animation from the File menu and reports the saved path', async () => {
    const fixture = TestBed.createComponent(App);
    getEditor(fixture.componentInstance).createBlankProject();
    fixture.detectChanges();
    const fileMenu = menu(fixture.nativeElement, 'File');
    const exportButton = [...fileMenu.querySelectorAll<HTMLButtonElement>('button')].find(
      ({ textContent }) => textContent?.includes('Export MP4'),
    );

    expect(exportButton?.disabled).toBe(false);
    exportButton?.click();
    await vi.waitFor(() => expect(completeMp4Export).toHaveBeenCalledWith('session-1'));
    fixture.detectChanges();

    expect(startMp4Export).toHaveBeenCalledWith({
      suggestedName: 'Untitled animation',
      fps: 12,
      frameCount: 1,
    });
    expect(writeMp4Frame).toHaveBeenCalledOnce();
    expect(fixture.nativeElement.querySelector('dialog')?.textContent).toContain('Export complete');
    expect(fixture.nativeElement.querySelector('dialog')?.textContent).toContain(
      '/Users/test/Untitled animation.mp4',
    );
  });
});
