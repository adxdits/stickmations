import { TestBed } from '@angular/core/testing';
import { vi } from 'vitest';
import { App } from './app';
import type { StickmationsDesktopApi } from './io/desktop-api';
import { configureAppTestBed, getEditor, menu } from './testing/app-test-harness';

describe('App project save', () => {
  const startProjectSave = vi.fn();
  const writeProjectChunk = vi.fn();
  const completeProjectSave = vi.fn();
  const cancelProjectSave = vi.fn();

  beforeEach(async () => {
    startProjectSave.mockResolvedValue({ status: 'ready', sessionId: 'project-save-1' });
    writeProjectChunk.mockResolvedValue(undefined);
    completeProjectSave.mockResolvedValue({ path: '/Users/test/Untitled project.stickmation' });
    cancelProjectSave.mockResolvedValue(undefined);
    window.stickmationsDesktop = desktopApi();
    await configureAppTestBed();
  });

  afterEach(() => {
    delete window.stickmationsDesktop;
    TestBed.resetTestingModule();
    vi.clearAllMocks();
  });

  it('saves the complete editor document from the File menu', async () => {
    const fixture = TestBed.createComponent(App);
    getEditor(fixture.componentInstance).createBlankProject();
    fixture.detectChanges();
    const saveButton = [...menu(fixture.nativeElement, 'File').querySelectorAll('button')].find(
      ({ textContent }) => textContent?.includes('Save project'),
    );

    expect(saveButton?.disabled).toBe(false);
    saveButton?.click();
    await vi.waitFor(() => expect(completeProjectSave).toHaveBeenCalledWith('project-save-1'));

    expect(startProjectSave).toHaveBeenCalledWith({ suggestedName: 'Untitled project' });
    const chunks = writeProjectChunk.mock.calls.map(([, chunk]) => chunk as Uint8Array);
    const savedProject = JSON.parse(decodeChunks(chunks));
    expect(savedProject).toMatchObject({
      format: 'stickmations-project',
      version: 1,
      name: 'Untitled project',
      document: { fps: 12, currentFrame: 1, selectedFigureId: null },
    });
    expect(savedProject.frames).toHaveLength(1);
  });

  it('saves with the platform keyboard shortcut', async () => {
    const fixture = TestBed.createComponent(App);
    getEditor(fixture.componentInstance).createBlankProject();
    fixture.detectChanges();
    const event = new KeyboardEvent('keydown', {
      key: 's',
      metaKey: true,
      cancelable: true,
    });

    window.dispatchEvent(event);
    await vi.waitFor(() => expect(startProjectSave).toHaveBeenCalledOnce());

    expect(event.defaultPrevented).toBe(true);
  });

  it('reports a failed partial save', async () => {
    writeProjectChunk.mockRejectedValueOnce(new Error('Disk full'));
    const fixture = TestBed.createComponent(App);
    getEditor(fixture.componentInstance).createBlankProject();
    fixture.detectChanges();

    const saveButton = fixture.nativeElement.querySelector(
      'button[aria-label="Save project"]',
    ) as HTMLButtonElement;
    saveButton.click();
    await vi.waitFor(() => expect(cancelProjectSave).toHaveBeenCalledWith('project-save-1'));
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('[role="alert"]')?.textContent).toContain(
      'Disk full',
    );
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

function decodeChunks(chunks: readonly Uint8Array[]): string {
  const decoder = new TextDecoder();
  return chunks.map((chunk) => decoder.decode(chunk, { stream: true })).join('') + decoder.decode();
}
