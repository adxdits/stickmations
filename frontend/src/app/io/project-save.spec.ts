import { TestBed } from '@angular/core/testing';
import { vi } from 'vitest';
import { createFigureLayer, createSceneFrame } from '../domain/scene-frame';
import { simpleFigure } from '../testing/app-test-harness';
import type { StickmationsDesktopApi } from './desktop-api';
import type { ProjectSnapshot } from './project-file';
import { projectFileName, ProjectSaveService } from './project-save';

describe('ProjectSaveService', () => {
  const startProjectSave = vi.fn();
  const writeProjectChunk = vi.fn();
  const completeProjectSave = vi.fn();
  const cancelProjectSave = vi.fn();

  beforeEach(() => {
    startProjectSave.mockResolvedValue({ status: 'ready', sessionId: 'save-1' });
    writeProjectChunk.mockResolvedValue(undefined);
    completeProjectSave.mockResolvedValue({ path: '/Users/test/Example.stickmation' });
    cancelProjectSave.mockResolvedValue(undefined);
    window.stickmationsDesktop = desktopApi();
  });

  afterEach(() => {
    delete window.stickmationsDesktop;
    TestBed.resetTestingModule();
    vi.clearAllMocks();
  });

  it('streams a complete project through the desktop save session', async () => {
    const service = TestBed.inject(ProjectSaveService);

    await service.save(projectSnapshot());

    expect(startProjectSave).toHaveBeenCalledWith({ suggestedName: 'Example' });
    expect(writeProjectChunk).toHaveBeenCalled();
    expect(
      writeProjectChunk.mock.calls.every(
        ([sessionId, chunk]) => sessionId === 'save-1' && chunk instanceof Uint8Array,
      ),
    ).toBe(true);
    expect(completeProjectSave).toHaveBeenCalledWith('save-1');
    expect(service.state()).toEqual({
      phase: 'complete',
      outputPath: '/Users/test/Example.stickmation',
      error: null,
    });
  });

  it('does not write when the native save dialog is cancelled', async () => {
    startProjectSave.mockResolvedValue({ status: 'cancelled' });
    const service = TestBed.inject(ProjectSaveService);

    await service.save(projectSnapshot());

    expect(writeProjectChunk).not.toHaveBeenCalled();
    expect(service.state().phase).toBe('idle');
  });

  it('cancels and reports a failed partial save', async () => {
    writeProjectChunk.mockRejectedValue(new Error('Disk full'));
    const service = TestBed.inject(ProjectSaveService);

    await service.save(projectSnapshot());

    expect(cancelProjectSave).toHaveBeenCalledWith('save-1');
    expect(service.state()).toEqual({ phase: 'error', outputPath: null, error: 'Disk full' });
  });

  it('creates a safe project file name', () => {
    expect(projectFileName(' Demo/project ')).toBe('Demo_project.stickmation');
    expect(projectFileName('demo.stickmation')).toBe('demo.stickmation');
  });

  function desktopApi(): StickmationsDesktopApi {
    return {
      startMp4Export: vi.fn(),
      writeMp4Frame: vi.fn(),
      completeMp4Export: vi.fn(),
      cancelMp4Export: vi.fn(),
      startProjectSave,
      writeProjectChunk,
      completeProjectSave,
      cancelProjectSave,
    };
  }
});

function projectSnapshot(): ProjectSnapshot {
  return {
    name: 'Example',
    fps: 12,
    currentFrame: 1,
    selectedFigureId: 'figure-1',
    frames: [createSceneFrame(createFigureLayer('figure-1', simpleFigure))],
  };
}
