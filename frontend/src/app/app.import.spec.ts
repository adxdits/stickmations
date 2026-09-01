import { TestBed } from '@angular/core/testing';
import { vi } from 'vitest';
import { App } from './app';
import { createFigureLayer, createSceneFrame } from './domain/scene-frame';
import { createProjectFile, type ProjectSnapshot } from './io/project-file';
import { configureAppTestBed, getEditor, menu, simpleFigure } from './testing/app-test-harness';

describe('App project import', () => {
  beforeEach(async () => {
    await configureAppTestBed();
  });

  afterEach(() => {
    TestBed.resetTestingModule();
  });

  it('imports an existing project from the File menu', async () => {
    const fixture = TestBed.createComponent(App);
    const editor = getEditor(fixture.componentInstance);
    editor.createBlankProject();
    editor.addFrame();
    fixture.detectChanges();

    const snapshot = projectSnapshot();
    const file = new File([JSON.stringify(createProjectFile(snapshot))], 'Imported.stickmation');
    const importControl = [...menu(fixture.nativeElement, 'File').querySelectorAll('label')].find(
      ({ textContent }) => textContent?.includes('Import existing project'),
    );
    const input = importControl?.querySelector('input[type="file"]') as HTMLInputElement | null;

    expect(importControl).toBeTruthy();
    expect(input?.accept).toContain('.stickmation');
    Object.defineProperty(input, 'files', { configurable: true, value: [file] });
    input?.dispatchEvent(new Event('change', { bubbles: true }));

    await vi.waitFor(() => expect(editor.projectName()).toBe('Imported animation'));
    fixture.detectChanges();

    expect(editor.animationFrames()).toEqual(snapshot.frames);
    expect(editor.currentFrame()).toBe(2);
    expect(editor.fps()).toBe(24);
    expect(editor.selectedFigureId()).toBe('figure-7');
    expect(editor.canUndo()).toBe(false);
    expect(fixture.nativeElement.textContent).toContain('Imported animation');
  });

  it('keeps the current document when an imported project is invalid', async () => {
    const fixture = TestBed.createComponent(App);
    const editor = getEditor(fixture.componentInstance);
    editor.createBlankProject();
    const originalFrames = editor.animationFrames();

    await editor.importProject(new File(['not a project'], 'Broken.stickmation'));

    expect(editor.animationFrames()).toBe(originalFrames);
    expect(editor.projectName()).toBe('Untitled project');
    expect(editor.importError()).toMatch(/not a valid Stickmations project/i);
  });

  it('cancels a stale project read before applying a newer project', async () => {
    const fixture = TestBed.createComponent(App);
    const editor = getEditor(fixture.componentInstance);
    const staleFile = new File(
      [JSON.stringify(createProjectFile({ ...projectSnapshot(), name: 'Stale project' }))],
      'Stale.stickmation',
    );
    let streamCancelled = false;
    let markStreamStarted!: () => void;
    const streamStarted = new Promise<void>((resolve) => {
      markStreamStarted = resolve;
    });
    Object.defineProperty(staleFile, 'stream', {
      configurable: true,
      value: () =>
        new ReadableStream<Uint8Array>({
          start() {
            markStreamStarted();
          },
          cancel() {
            streamCancelled = true;
          },
        }),
    });

    const staleImport = editor.importProject(staleFile);
    await streamStarted;
    await editor.importProject(
      new File([JSON.stringify(createProjectFile(projectSnapshot()))], 'Imported.stickmation'),
    );
    await staleImport;

    expect(streamCancelled).toBe(true);
    expect(editor.projectName()).toBe('Imported animation');
    expect(editor.importError()).toBeNull();
  });
});

function projectSnapshot(): ProjectSnapshot {
  const frame = createSceneFrame(createFigureLayer('figure-7', simpleFigure));
  return {
    name: 'Imported animation',
    fps: 24,
    currentFrame: 2,
    selectedFigureId: 'figure-7',
    frames: [frame, frame],
  };
}
