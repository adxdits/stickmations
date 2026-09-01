import { TestBed } from '@angular/core/testing';
import { vi } from 'vitest';
import { createSceneFrame } from '../domain/scene-frame';
import { Mp4ExportService, VIDEO_FRAME_RENDERER } from './mp4-export';

const renderVideoFramePng = vi.fn();

describe('Mp4ExportService', () => {
  beforeEach(() => {
    renderVideoFramePng.mockReset();
    renderVideoFramePng.mockResolvedValue(new Uint8Array([137, 80, 78, 71]));
    delete window.stickmationsDesktop;
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      providers: [{ provide: VIDEO_FRAME_RENDERER, useValue: renderVideoFramePng }],
    });
  });

  it('renders and streams every frame before completing the MP4', async () => {
    const desktop = desktopApi();
    window.stickmationsDesktop = desktop;
    const service = TestBed.inject(Mp4ExportService);
    const frames = [createSceneFrame(), createSceneFrame()];

    await service.export(frames, 24, 'Walk cycle');

    expect(desktop.startMp4Export).toHaveBeenCalledWith({
      suggestedName: 'Walk cycle',
      fps: 24,
      frameCount: 2,
    });
    expect(renderVideoFramePng).toHaveBeenCalledTimes(2);
    expect(desktop.writeMp4Frame).toHaveBeenCalledTimes(2);
    expect(desktop.completeMp4Export).toHaveBeenCalledWith('session-1');
    expect(service.state()).toEqual({
      phase: 'complete',
      renderedFrames: 2,
      totalFrames: 2,
      outputPath: '/tmp/Walk cycle.mp4',
      error: null,
    });
  });

  it('returns to idle when the native save dialog is cancelled', async () => {
    const desktop = desktopApi();
    desktop.startMp4Export.mockResolvedValue({ status: 'cancelled' });
    window.stickmationsDesktop = desktop;
    const service = TestBed.inject(Mp4ExportService);

    await service.export([createSceneFrame()], 12, 'Animation');

    expect(renderVideoFramePng).not.toHaveBeenCalled();
    expect(service.state().phase).toBe('idle');
  });

  it('reports encoder failures and cancels the active session', async () => {
    const desktop = desktopApi();
    desktop.writeMp4Frame.mockRejectedValue(new Error('Encoder stopped.'));
    window.stickmationsDesktop = desktop;
    const service = TestBed.inject(Mp4ExportService);

    await service.export([createSceneFrame()], 12, 'Animation');

    expect(desktop.cancelMp4Export).toHaveBeenCalledWith('session-1');
    expect(service.state().phase).toBe('error');
    expect(service.state().error).toBe('Encoder stopped.');
  });

  it('cancels an export without allowing stale rendering to change its state', async () => {
    let finishRendering: ((frame: Uint8Array) => void) | undefined;
    renderVideoFramePng.mockReturnValue(
      new Promise<Uint8Array>((resolve) => {
        finishRendering = resolve;
      }),
    );
    const desktop = desktopApi();
    window.stickmationsDesktop = desktop;
    const service = TestBed.inject(Mp4ExportService);
    const exporting = service.export([createSceneFrame()], 12, 'Animation');
    await vi.waitFor(() => expect(service.state().phase).toBe('rendering'));

    await service.cancel();
    finishRendering?.(new Uint8Array([137, 80, 78, 71]));
    await exporting;

    expect(desktop.cancelMp4Export).toHaveBeenCalledWith('session-1');
    expect(desktop.writeMp4Frame).not.toHaveBeenCalled();
    expect(service.state().phase).toBe('idle');
  });

  it('does not complete after an in-flight frame write is cancelled', async () => {
    let finishWriting: (() => void) | undefined;
    const desktop = desktopApi();
    desktop.writeMp4Frame.mockReturnValue(
      new Promise<void>((resolve) => {
        finishWriting = resolve;
      }),
    );
    window.stickmationsDesktop = desktop;
    const service = TestBed.inject(Mp4ExportService);
    const exporting = service.export([createSceneFrame()], 12, 'Animation');
    await vi.waitFor(() => expect(desktop.writeMp4Frame).toHaveBeenCalled());

    await service.cancel();
    finishWriting?.();
    await exporting;

    expect(desktop.completeMp4Export).not.toHaveBeenCalled();
    expect(service.state().phase).toBe('idle');
  });
});

function desktopApi() {
  return {
    startMp4Export: vi.fn().mockResolvedValue({ status: 'ready', sessionId: 'session-1' }),
    writeMp4Frame: vi.fn().mockResolvedValue(undefined),
    completeMp4Export: vi.fn().mockResolvedValue({ path: '/tmp/Walk cycle.mp4' }),
    cancelMp4Export: vi.fn().mockResolvedValue(undefined),
  };
}
