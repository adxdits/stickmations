import { TestBed } from '@angular/core/testing';
import { vi } from 'vitest';
import { App } from './app';
import { EditorDocumentStore } from './state/editor-document.store';
import { EditorOnionStore } from './state/editor-onion.store';
import { EditorViewportStore } from './state/editor-viewport.store';
import { configureAppTestBed, sceneFrame, simpleFigure } from './testing/app-test-harness';

function threeFrames(editor: EditorDocumentStore): void {
  const frame = sceneFrame(simpleFigure);
  editor.animationFrames.set([frame, frame, frame]);
  editor.currentFrame.set(2);
}

function onionGroups(root: HTMLElement): readonly Element[] {
  return [...root.querySelectorAll('[data-testid^="onion-skin-"]')];
}

describe('App onion skins', () => {
  beforeEach(async () => {
    globalThis.localStorage?.removeItem('stickmations.onion-skin.v1');
    await configureAppTestBed();
  });

  afterEach(() => {
    TestBed.inject(EditorOnionStore).setEnabled(false);
    globalThis.localStorage?.removeItem('stickmations.onion-skin.v1');
    TestBed.resetTestingModule();
    vi.clearAllMocks();
  });

  it('draws no ghosts until onion skins are switched on', () => {
    const fixture = TestBed.createComponent(App);
    threeFrames(TestBed.inject(EditorDocumentStore));
    fixture.detectChanges();

    expect(TestBed.inject(EditorOnionStore).enabled()).toBe(false);
    expect(onionGroups(fixture.nativeElement)).toHaveLength(0);
  });

  it('ghosts the neighbouring frames once enabled', () => {
    const fixture = TestBed.createComponent(App);
    threeFrames(TestBed.inject(EditorDocumentStore));
    TestBed.inject(EditorOnionStore).setEnabled(true);
    fixture.detectChanges();

    const testIds = onionGroups(fixture.nativeElement).map((group) =>
      group.getAttribute('data-testid'),
    );
    expect(testIds).toEqual(['onion-skin--1', 'onion-skin-1']);
  });

  it('hides the ghosts while the animation is playing', () => {
    const fixture = TestBed.createComponent(App);
    threeFrames(TestBed.inject(EditorDocumentStore));
    TestBed.inject(EditorOnionStore).setEnabled(true);
    fixture.detectChanges();
    expect(onionGroups(fixture.nativeElement)).not.toHaveLength(0);

    TestBed.inject(EditorViewportStore).startPlaybackPreview();
    fixture.detectChanges();

    expect(onionGroups(fixture.nativeElement)).toHaveLength(0);
  });

  it('brings the ghosts back when playback stops', () => {
    const fixture = TestBed.createComponent(App);
    threeFrames(TestBed.inject(EditorDocumentStore));
    TestBed.inject(EditorOnionStore).setEnabled(true);
    const viewport = TestBed.inject(EditorViewportStore);
    viewport.startPlaybackPreview();
    fixture.detectChanges();

    viewport.stopPlaybackPreview();
    fixture.detectChanges();

    expect(onionGroups(fixture.nativeElement)).toHaveLength(2);
  });

  it('turns the ghosts off again from the toolbar', () => {
    const fixture = TestBed.createComponent(App);
    threeFrames(TestBed.inject(EditorDocumentStore));
    TestBed.inject(EditorOnionStore).setEnabled(true);
    fixture.detectChanges();

    const toggle = (fixture.nativeElement as HTMLElement).querySelector<HTMLButtonElement>(
      'button[aria-label="Onion skins"]',
    );
    expect(toggle?.getAttribute('aria-pressed')).toBe('true');
    toggle?.click();
    fixture.detectChanges();

    expect(TestBed.inject(EditorOnionStore).enabled()).toBe(false);
    expect(onionGroups(fixture.nativeElement)).toHaveLength(0);
  });

  it('remembers the setting across sessions', () => {
    TestBed.inject(EditorOnionStore).setBefore(3);

    expect(globalThis.localStorage?.getItem('stickmations.onion-skin.v1')).toContain('"before":3');
  });
});
