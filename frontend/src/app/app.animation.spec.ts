import { TestBed } from '@angular/core/testing';
import { App } from './app';
import {
  configureAppTestBed,
  figureFile,
  getEditor,
  getViewport,
  moveRoot,
  sceneFrame,
  simpleFigure,
} from './testing/app-test-harness';

describe('Animation workflow', () => {
  beforeEach(async () => {
    await configureAppTestBed();
  });

  it('adds and edits an independent frame snapshot', () => {
    const fixture = TestBed.createComponent(App);
    const app = getEditor(fixture.componentInstance);
    app.animationFrames.set([sceneFrame(simpleFigure)]);
    fixture.detectChanges();

    const addFrame = fixture.nativeElement.querySelector(
      'button[aria-label="Add frame"]',
    ) as HTMLButtonElement;
    addFrame.click();
    fixture.detectChanges();

    expect(app.animationFrames()).toHaveLength(2);
    expect(app.currentFrame()).toBe(2);

    const secondFrame = app.animationFrames()[1]!.figures[0]!.figure;
    app.updateCurrentFrame({
      ...secondFrame,
      joints: secondFrame.joints.map((joint) =>
        joint.id === 'root' ? { ...joint, x: 25 } : joint,
      ),
    });

    const firstFrameButton = fixture.nativeElement.querySelector(
      'button[aria-label="Go to scene frame 1"]',
    ) as HTMLButtonElement;
    firstFrameButton.click();

    expect(app.currentFrame()).toBe(1);
    expect(app.animationFrames()[0]?.figures[0]?.figure.joints[0]?.x).toBe(0);
    expect(app.animationFrames()[1]?.figures[0]?.figure.joints[0]?.x).toBe(25);
    expect(app.animationFrames()[0]).not.toBe(app.animationFrames()[1]);
  });

  it('applies rotation only to the selected frame', () => {
    const fixture = TestBed.createComponent(App);
    const app = getEditor(fixture.componentInstance);
    app.animationFrames.set([sceneFrame(simpleFigure), sceneFrame(simpleFigure)]);
    app.currentFrame.set(2);
    fixture.detectChanges();

    const rotation = fixture.nativeElement.querySelector(
      'input[aria-label="Timeline rotation"]',
    ) as HTMLInputElement;
    rotation.value = '90';
    rotation.dispatchEvent(new Event('input'));

    expect(app.animationFrames()[0]?.figures[0]?.figure.joints[1]).toMatchObject({
      x: 100,
      y: 50,
    });
    expect(app.animationFrames()[1]?.figures[0]?.figure.joints[1]?.x).toBeCloseTo(-50);
    expect(app.animationFrames()[1]?.figures[0]?.figure.joints[1]?.y).toBeCloseTo(100);
    expect(app.animationFrames()[1]?.figures[0]?.transform.rotation).toBe(90);
  });

  it('scrubs to a frame with the timeline slider', () => {
    const fixture = TestBed.createComponent(App);
    const app = getEditor(fixture.componentInstance);
    app.animationFrames.set([
      sceneFrame(simpleFigure),
      sceneFrame(simpleFigure),
      sceneFrame(simpleFigure),
    ]);
    fixture.detectChanges();

    const scrubber = fixture.nativeElement.querySelector(
      'input[aria-label="Current frame"]',
    ) as HTMLInputElement;
    scrubber.value = '3';
    scrubber.dispatchEvent(new Event('input'));

    expect(app.currentFrame()).toBe(3);
  });

  it('undoes and redoes a frame transform', () => {
    const fixture = TestBed.createComponent(App);
    const app = getEditor(fixture.componentInstance);
    app.animationFrames.set([sceneFrame(simpleFigure)]);
    fixture.detectChanges();

    const positionX = fixture.nativeElement.querySelector(
      'input[aria-label="Timeline position X"]',
    ) as HTMLInputElement;
    positionX.value = '25';
    positionX.dispatchEvent(new Event('input'));
    fixture.detectChanges();
    expect(app.animationFrames()[0]?.figures[0]?.figure.joints[0]?.x).toBe(25);

    (fixture.nativeElement.querySelector('button[aria-label="Undo"]') as HTMLButtonElement).click();
    fixture.detectChanges();
    expect(app.animationFrames()[0]?.figures[0]?.figure.joints[0]?.x).toBe(0);

    (fixture.nativeElement.querySelector('button[aria-label="Redo"]') as HTMLButtonElement).click();
    expect(app.animationFrames()[0]?.figures[0]?.figure.joints[0]?.x).toBe(25);
  });

  it('deletes the selected frame and restores it with undo', () => {
    const fixture = TestBed.createComponent(App);
    const app = getEditor(fixture.componentInstance);
    app.animationFrames.set([
      sceneFrame({ ...simpleFigure, name: 'First' }),
      sceneFrame({ ...simpleFigure, name: 'Second' }),
    ]);
    app.currentFrame.set(2);
    fixture.detectChanges();

    (
      fixture.nativeElement.querySelector('button[aria-label="Delete frame"]') as HTMLButtonElement
    ).click();
    fixture.detectChanges();
    expect(app.animationFrames()).toHaveLength(1);
    expect(app.currentFrame()).toBe(1);

    (fixture.nativeElement.querySelector('button[aria-label="Undo"]') as HTMLButtonElement).click();
    expect(app.animationFrames()).toHaveLength(2);
    expect(app.currentFrame()).toBe(2);
  });

  it('reorders frames by drag and keeps the selected frame selected', () => {
    const fixture = TestBed.createComponent(App);
    const app = getEditor(fixture.componentInstance);
    app.animationFrames.set([
      sceneFrame({ ...simpleFigure, name: 'First' }),
      sceneFrame({ ...simpleFigure, name: 'Second' }),
      sceneFrame({ ...simpleFigure, name: 'Third' }),
    ]);
    app.currentFrame.set(1);
    fixture.detectChanges();

    const first = fixture.nativeElement.querySelector(
      'button[aria-label="Go to scene frame 1"]',
    ) as HTMLButtonElement;
    const third = fixture.nativeElement.querySelector(
      'button[aria-label="Go to scene frame 3"]',
    ) as HTMLButtonElement;
    first.dispatchEvent(new Event('dragstart'));
    third.dispatchEvent(new Event('drop'));

    expect(app.animationFrames().map(({ figures }) => figures[0]?.figure.name)).toEqual([
      'Second',
      'Third',
      'First',
    ]);
    expect(app.currentFrame()).toBe(3);
  });

  it('switches frames with previous and next controls', () => {
    const fixture = TestBed.createComponent(App);
    const app = getEditor(fixture.componentInstance);
    app.animationFrames.set([sceneFrame(simpleFigure), sceneFrame(simpleFigure)]);
    fixture.detectChanges();

    const previous = fixture.nativeElement.querySelector(
      'button[aria-label="Previous scene frame"]',
    ) as HTMLButtonElement;
    const next = fixture.nativeElement.querySelector(
      'button[aria-label="Next scene frame"]',
    ) as HTMLButtonElement;
    expect(previous.disabled).toBe(true);
    next.click();
    fixture.detectChanges();
    expect(app.currentFrame()).toBe(2);
    expect(next.disabled).toBe(true);
    previous.click();
    expect(app.currentFrame()).toBe(1);
  });

  it('adds a blank frame after an existing pose', () => {
    const fixture = TestBed.createComponent(App);
    const app = getEditor(fixture.componentInstance);
    app.animationFrames.set([sceneFrame(simpleFigure)]);
    fixture.detectChanges();

    const addBlank = fixture.nativeElement.querySelector(
      'button[aria-label="Add blank frame"]',
    ) as HTMLButtonElement;
    addBlank.click();

    expect(app.animationFrames()).toHaveLength(2);
    expect(app.currentFrame()).toBe(2);
    expect(app.animationFrames()[0]?.figures[0]?.figure.segments).toHaveLength(1);
    expect(app.animationFrames()[1]?.figures).toHaveLength(0);
  });

  it('rotates and flips only the selected figure layer', async () => {
    const fixture = TestBed.createComponent(App);
    const app = getEditor(fixture.componentInstance);
    await app.importFigures([
      figureFile({ ...simpleFigure, name: 'First figure' }, 'first.json'),
      figureFile({ ...simpleFigure, name: 'Second figure' }, 'second.json'),
    ]);
    fixture.detectChanges();

    const flipX = fixture.nativeElement.querySelector(
      'button[aria-label="Flip figure X"]',
    ) as HTMLButtonElement;
    flipX.click();

    expect(app.animationFrames()[0]?.figures[0]?.figure.joints[1]).toMatchObject({
      x: 100,
      y: 50,
    });
    expect(app.animationFrames()[0]?.figures[1]?.figure.joints[1]).toMatchObject({
      x: -100,
      y: 50,
    });
    expect(app.animationFrames()[0]?.figures[1]?.transform.flipX).toBe(true);

    (fixture.nativeElement.querySelector('button[aria-label="Undo"]') as HTMLButtonElement).click();
    fixture.detectChanges();
    expect(app.animationFrames()[0]?.figures[1]?.figure.joints[1]).toMatchObject({
      x: 100,
      y: 50,
    });

    (
      fixture.nativeElement.querySelector(
        'button[aria-label="Rotate figure right"]',
      ) as HTMLButtonElement
    ).click();
    (
      fixture.nativeElement.querySelector('button[aria-label="Flip figure Y"]') as HTMLButtonElement
    ).click();

    expect(app.animationFrames()[0]?.figures[1]?.figure.joints[1]?.x).toBeCloseTo(50);
    expect(app.animationFrames()[0]?.figures[1]?.figure.joints[1]?.y).toBeCloseTo(100);
    expect(app.animationFrames()[0]?.figures[1]?.transform).toMatchObject({
      rotation: -90,
      flipX: false,
      flipY: true,
    });
  });

  it('uniformly scales only the selected figure layer in one undo step', async () => {
    const fixture = TestBed.createComponent(App);
    const app = getEditor(fixture.componentInstance);
    await app.importFigures([
      figureFile({ ...simpleFigure, name: 'First figure' }, 'first.json'),
      figureFile({ ...simpleFigure, name: 'Second figure' }, 'second.json'),
    ]);
    fixture.detectChanges();

    const uniformScale = fixture.nativeElement.querySelector(
      'input[aria-label="Uniform scale"]',
    ) as HTMLInputElement;
    uniformScale.value = '150';
    uniformScale.dispatchEvent(new Event('input'));

    expect(app.animationFrames()[0]?.figures[0]?.figure.joints[1]).toMatchObject({
      x: 100,
      y: 50,
    });
    expect(app.animationFrames()[0]?.figures[1]?.figure.joints[1]).toMatchObject({
      x: 150,
      y: 75,
    });
    expect(app.animationFrames()[0]?.figures[1]?.transform).toMatchObject({
      scaleX: 150,
      scaleY: 150,
    });

    (fixture.nativeElement.querySelector('button[aria-label="Undo"]') as HTMLButtonElement).click();
    expect(app.animationFrames()[0]?.figures[1]?.figure.joints[1]).toMatchObject({
      x: 100,
      y: 50,
    });
    expect(app.animationFrames()[0]?.figures[1]?.transform).toMatchObject({
      scaleX: 100,
      scaleY: 100,
    });
  });

  it('controls project FPS, timecode, and playback speed', () => {
    vi.useFakeTimers();
    try {
      const fixture = TestBed.createComponent(App);
      const app = getEditor(fixture.componentInstance);
      const viewport = getViewport(fixture.componentInstance);
      app.animationFrames.set(Array.from({ length: 30 }, () => sceneFrame(simpleFigure)));
      app.selectFrame(25);
      viewport.zoom.set(200);
      viewport.pan.set({ x: 48, y: -24 });
      viewport.controlMode.set('pan');
      fixture.detectChanges();

      const fps = fixture.nativeElement.querySelector(
        'input[aria-label="Animation FPS"]',
      ) as HTMLInputElement;
      fps.value = '24';
      fps.dispatchEvent(new Event('change'));
      fixture.detectChanges();

      expect(app.fps()).toBe(24);
      expect(fixture.nativeElement.textContent).toContain('00:00:01:00');

      (
        fixture.nativeElement.querySelector('button[aria-label="Play"]') as HTMLButtonElement
      ).click();
      expect(viewport.isPlaybackPreview()).toBe(true);
      expect(viewport.zoom()).toBe(100);
      expect(viewport.pan()).toEqual({ x: 0, y: 0 });
      expect(viewport.controlMode()).toBe('none');
      vi.advanceTimersByTime(42);
      fixture.detectChanges();
      expect(app.currentFrame()).toBe(26);
      (
        fixture.nativeElement.querySelector('button[aria-label="Pause"]') as HTMLButtonElement
      ).click();
      expect(viewport.isPlaybackPreview()).toBe(false);
      expect(viewport.zoom()).toBe(200);
      expect(viewport.pan()).toEqual({ x: 48, y: -24 });
      expect(viewport.controlMode()).toBe('pan');

      fps.value = '120';
      fps.dispatchEvent(new Event('change'));
      expect(app.fps()).toBe(60);
      fps.value = '0';
      fps.dispatchEvent(new Event('change'));
      expect(app.fps()).toBe(1);

      app.undo();
      expect(app.fps()).toBe(60);
    } finally {
      vi.useRealTimers();
    }
  });
});
