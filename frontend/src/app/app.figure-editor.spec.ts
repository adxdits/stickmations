import { TestBed } from '@angular/core/testing';
import { vi } from 'vitest';
import { App } from './app';
import { EditorFigureStore } from './state/editor-figure.store';
import { configureAppTestBed, getEditor, menu, simpleFigure } from './testing/app-test-harness';

function pressKey(key: string, modifiers: Partial<KeyboardEventInit> = {}): void {
  window.dispatchEvent(new KeyboardEvent('keydown', { key, bubbles: true, ...modifiers }));
}

describe('App figure editor', () => {
  beforeEach(async () => {
    await configureAppTestBed();
  });

  afterEach(() => {
    TestBed.inject(EditorFigureStore).close();
    TestBed.resetTestingModule();
    vi.clearAllMocks();
  });

  it('opens the drawing surface from the File menu', () => {
    const fixture = TestBed.createComponent(App);
    fixture.detectChanges();
    const openButton = [...menu(fixture.nativeElement, 'File').querySelectorAll('button')].find(
      ({ textContent }) => textContent?.includes('New stick figure'),
    );

    openButton?.click();
    fixture.detectChanges();

    const root = fixture.nativeElement as HTMLElement;
    expect(TestBed.inject(EditorFigureStore).isOpen()).toBe(true);
    expect(root.querySelector('[aria-label="Figure drawing canvas"]')).not.toBeNull();
    expect(root.querySelector('[aria-label="Animation workspace"]')).toBeNull();
  });

  it('restores the animation workspace when the editor closes', () => {
    const fixture = TestBed.createComponent(App);
    const store = TestBed.inject(EditorFigureStore);
    store.open();
    fixture.detectChanges();

    store.close();
    fixture.detectChanges();

    const root = fixture.nativeElement as HTMLElement;
    expect(root.querySelector('[aria-label="Figure drawing canvas"]')).toBeNull();
    expect(root.querySelector('[aria-label="Animation workspace"]')).not.toBeNull();
  });

  it('keeps undo from reaching the animation while the editor is open', () => {
    const fixture = TestBed.createComponent(App);
    const editor = getEditor(fixture.componentInstance);
    editor.createBlankProject();
    editor.importFigures([]);
    fixture.detectChanges();

    const store = TestBed.inject(EditorFigureStore);
    store.open();
    store.clickCanvas({ x: 0, y: 0 });
    store.clickCanvas({ x: 0, y: 40 });
    fixture.detectChanges();
    const framesBefore = editor.animationFrames().length;

    pressKey('z', { ctrlKey: true });
    fixture.detectChanges();

    // The figure loses its second joint; the animation document is untouched.
    expect(store.figure().joints).toHaveLength(1);
    expect(editor.animationFrames().length).toBe(framesBefore);
  });

  it('saves the drawn figure through the browser fallback', async () => {
    const fixture = TestBed.createComponent(App);
    const store = TestBed.inject(EditorFigureStore);
    store.open();
    store.rename('Runner');
    store.clickCanvas({ x: 0, y: 0 });
    store.clickCanvas({ x: 0, y: 40 });
    fixture.detectChanges();

    const anchor = document.createElement('a');
    const click = vi.spyOn(anchor, 'click').mockImplementation(() => undefined);
    vi.spyOn(document, 'createElement').mockReturnValueOnce(anchor);
    const createObjectURL = vi.fn().mockReturnValue('blob:figure');
    const revokeObjectURL = vi.fn();
    vi.stubGlobal('URL', { ...URL, createObjectURL, revokeObjectURL });

    const saveButton = [...(fixture.nativeElement as HTMLElement).querySelectorAll('button')].find(
      ({ textContent }) => textContent?.includes('Save figure'),
    );
    saveButton?.click();
    await fixture.whenStable();

    expect(click).toHaveBeenCalled();
    expect(anchor.download).toBe('Runner.json');
    vi.unstubAllGlobals();
  });

  it('offers a select tool and paints joints in their own color', () => {
    const fixture = TestBed.createComponent(App);
    const store = TestBed.inject(EditorFigureStore);
    store.open();
    store.clickCanvas({ x: 0, y: 0 });
    store.editJoint({ color: '#12ab34' });
    fixture.detectChanges();

    const root = fixture.nativeElement as HTMLElement;
    const selectTool = root.querySelector<HTMLButtonElement>('button[aria-label="Select"]');
    expect(selectTool).not.toBeNull();
    expect(selectTool?.querySelector('svg')).not.toBeNull();

    const handle = root.querySelector('[aria-label^="Joint "]');
    expect(handle?.getAttribute('fill')).toBe('#12ab34');
  });

  it('renders an imported figure in the editor when seeded with one', () => {
    const fixture = TestBed.createComponent(App);
    const store = TestBed.inject(EditorFigureStore);

    store.open(simpleFigure);
    fixture.detectChanges();

    const root = fixture.nativeElement as HTMLElement;
    expect(root.querySelectorAll('[aria-label^="Joint "]')).toHaveLength(2);
    expect(root.querySelectorAll('[aria-label^="Segment "]')).toHaveLength(1);
  });
});
