import { TestBed } from '@angular/core/testing';
import type { StickFigure } from '@framation/engine';
import { App } from './app';
import { EditorDocumentStore } from './editor-document.store';
import { EditorViewportStore } from './editor-viewport.store';
import { EditorWorkspaceStore } from './editor-workspace.store';
import { createFigureLayer, createSceneFrame, type SceneFrame } from './scene-frame';

const simpleFigure: StickFigure = {
  version: 1,
  name: 'Test figure',
  joints: [
    { id: 'root', x: 0, y: 0, radius: 5, color: '#000000' },
    { id: 'hand', x: 100, y: 50, radius: 5, color: '#000000' },
  ],
  segments: [{ id: 'arm', from: 'root', to: 'hand', width: 8, color: '#ff0000' }],
};

describe('App', () => {
  beforeEach(async () => {
    globalThis.localStorage?.removeItem('framation.workspace-layout.v1');
    await TestBed.configureTestingModule({
      imports: [App],
    }).compileComponents();
  });

  it('should create the app', () => {
    const fixture = TestBed.createComponent(App);
    const app = fixture.componentInstance;
    expect(app).toBeTruthy();
  });

  it('should render title', async () => {
    const fixture = TestBed.createComponent(App);
    await fixture.whenStable();
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelector('h1')?.textContent).toContain('Framation');
  });

  it('should render a stick-figure file input', () => {
    const fixture = TestBed.createComponent(App);
    fixture.detectChanges();
    const compiled = fixture.nativeElement as HTMLElement;
    const input = compiled.querySelector<HTMLInputElement>('input[type="file"]');

    expect(input).toBeTruthy();
    expect(input?.accept).toContain('.nodes');
    expect(input?.multiple).toBe(true);
  });

  it('should render an imported figure as SVG', () => {
    const fixture = TestBed.createComponent(App);
    const app = getEditor(fixture.componentInstance);
    app.animationFrames.set([sceneFrame(simpleFigure)]);
    fixture.detectChanges();

    const compiled = fixture.nativeElement as HTMLElement;
    const canvas = compiled.querySelector('svg[role="img"]');
    expect(canvas).toBeTruthy();
    expect(canvas?.querySelectorAll('line')).toHaveLength(1);
    expect(canvas?.querySelectorAll('circle')).toHaveLength(0);
  });

  it('renders circle nodes from their diameter with an upright Y axis', () => {
    const fixture = TestBed.createComponent(App);
    const app = getEditor(fixture.componentInstance);
    app.animationFrames.set([
      sceneFrame({
        version: 1,
        name: 'Circle figure',
        joints: [
          { id: 'root', x: 0, y: 0, radius: 1, color: '#000000' },
          { id: 'head-edge', x: 0, y: 100, radius: 1, color: '#ff0000' },
        ],
        segments: [
          {
            id: 'head',
            from: 'root',
            to: 'head-edge',
            width: 4,
            color: '#ff0000',
            shape: 'circle',
            hollow: false,
          },
        ],
      }),
    ]);
    fixture.detectChanges();

    const circle = fixture.nativeElement.querySelector(
      'svg[role="img"] circle',
    ) as SVGCircleElement;
    expect(circle.getAttribute('cy')).toBe('-50');
    expect(circle.getAttribute('r')).toBe('50');
    expect(circle.getAttribute('fill')).toBe('#ff0000');
  });

  it('provides figure and editable-joint controls', () => {
    const fixture = TestBed.createComponent(App);
    const app = getEditor(fixture.componentInstance);
    app.animationFrames.set([
      sceneFrame({
        version: 1,
        name: 'Controllable figure',
        joints: [
          { id: 'root', x: 0, y: 0, radius: 1, color: '#000000', isStatic: false },
          { id: 'neck', x: 0, y: 50, radius: 1, color: '#000000', isStatic: true },
          { id: 'head', x: 0, y: 100, radius: 1, color: '#000000', isStatic: false },
          { id: 'left-hand', x: -100, y: 0, radius: 1, color: '#000000', isStatic: false },
          { id: 'right-hand', x: 100, y: 0, radius: 1, color: '#000000', isStatic: false },
          { id: 'left-foot', x: -40, y: -100, radius: 1, color: '#000000', isStatic: false },
          { id: 'right-foot', x: 40, y: -100, radius: 1, color: '#000000', isStatic: false },
        ],
        segments: [
          { id: 'neck', from: 'root', to: 'neck', width: 4, color: '#000000' },
          {
            id: 'head-shape',
            from: 'neck',
            to: 'head',
            width: 4,
            color: '#000000',
            shape: 'circle',
          },
          { id: 'left-arm', from: 'root', to: 'left-hand', width: 4, color: '#000000' },
          { id: 'right-arm', from: 'root', to: 'right-hand', width: 4, color: '#000000' },
          { id: 'left-leg', from: 'root', to: 'left-foot', width: 4, color: '#000000' },
          { id: 'right-leg', from: 'root', to: 'right-foot', width: 4, color: '#000000' },
        ],
      }),
    ]);
    fixture.detectChanges();

    const compiled = fixture.nativeElement as HTMLElement;
    const jointsTool = compiled.querySelector(
      'button[aria-label="Edit all joints"]',
    ) as HTMLButtonElement;
    jointsTool.click();
    fixture.detectChanges();

    const canvas = compiled.querySelector('svg[role="img"]') as SVGSVGElement;
    expect(canvas.querySelector('rect[aria-label="Move figure"]')).toBeTruthy();
    expect(canvas.querySelectorAll('circle[role="button"]')).toHaveLength(5);

    const center = canvas.querySelector('rect[aria-label="Move figure"]') as SVGRectElement;
    center.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight' }));
    fixture.detectChanges();
    expect(center.getAttribute('x')).toBe('-1');
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

  it('stores camera animation independently per frame and supports undo', () => {
    const fixture = TestBed.createComponent(App);
    const app = getEditor(fixture.componentInstance);
    app.animationFrames.set([sceneFrame(simpleFigure)]);

    app.addFrame();
    app.updateCamera({ property: 'positionX', value: 120 });
    app.updateCamera({ property: 'rotation', value: 25 });

    expect(app.animationFrames()[0]?.camera).toMatchObject({ positionX: 0, rotation: 0 });
    expect(app.animationFrames()[1]?.camera).toMatchObject({ positionX: 120, rotation: 25 });

    app.undo();
    expect(app.animationFrames()[1]?.camera.rotation).toBe(0);
  });

  it('edits the camera box and uses it as the rotated playback preview', () => {
    vi.useFakeTimers();
    try {
      const fixture = TestBed.createComponent(App);
      const app = getEditor(fixture.componentInstance);
      app.animationFrames.set([sceneFrame(simpleFigure)]);
      app.updateCamera({ property: 'positionX', value: 25 });
      app.updateCamera({ property: 'positionY', value: -10 });
      app.updateCamera({ property: 'width', value: 320 });
      app.updateCamera({ property: 'height', value: 180 });
      fixture.detectChanges();

      const cameraRotation = fixture.nativeElement.querySelector(
        'input[aria-label="Camera rotation"]',
      ) as HTMLInputElement;
      cameraRotation.value = '30';
      cameraRotation.dispatchEvent(new Event('input'));
      expect(
        (
          fixture.nativeElement.querySelector(
            'input[aria-label="Timeline camera position X"]',
          ) as HTMLInputElement
        ).value,
      ).toBe('25');
      (
        fixture.nativeElement.querySelector('button[aria-label="Edit camera"]') as HTMLButtonElement
      ).click();
      fixture.detectChanges();

      const cameraFrame = fixture.nativeElement.querySelector(
        '[data-testid="camera-frame"]',
      ) as SVGGElement;
      expect(cameraFrame.getAttribute('transform')).toBe('rotate(30 25 -10)');
      expect(cameraFrame.querySelector('[aria-label="Move camera"]')).toBeTruthy();
      expect(cameraFrame.querySelector('[aria-label="Rotate camera"]')).toBeTruthy();
      expect(cameraFrame.querySelector('[aria-label="Resize camera"]')).toBeTruthy();
      const thumbnail = fixture.nativeElement.querySelector(
        'svg[data-frame-preview]',
      ) as SVGSVGElement;
      expect(thumbnail.getAttribute('viewBox')).toBe('-135 -100 320 180');
      expect(thumbnail.querySelector('[data-thumbnail-scene]')?.getAttribute('transform')).toBe(
        'rotate(-30 25 -10)',
      );

      (
        fixture.nativeElement.querySelector('button[aria-label="Play"]') as HTMLButtonElement
      ).click();
      fixture.detectChanges();

      const canvas = fixture.nativeElement.querySelector(
        'svg[aria-label="Scene preview"]',
      ) as SVGSVGElement;
      expect(canvas.getAttribute('viewBox')).toBe('-135 -100 320 180');
      expect(canvas.querySelector('[data-testid="camera-scene"]')?.getAttribute('transform')).toBe(
        'rotate(-30 25 -10)',
      );
      expect(canvas.querySelector('[data-testid="camera-frame"]')).toBeNull();

      (
        fixture.nativeElement.querySelector('button[aria-label="Pause"]') as HTMLButtonElement
      ).click();
      fixture.detectChanges();
      expect(canvas.querySelector('[data-testid="camera-frame"]')).toBeTruthy();
    } finally {
      vi.useRealTimers();
    }
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

  it('groups a drag into one undo step', () => {
    const fixture = TestBed.createComponent(App);
    const app = getEditor(fixture.componentInstance);
    app.animationFrames.set([sceneFrame(simpleFigure)]);

    app.beginFrameEdit();
    app.updateCurrentFrame(moveRoot(simpleFigure, 10));
    app.updateCurrentFrame(moveRoot(simpleFigure, 20));
    app.endFrameEdit();
    app.undo();

    expect(app.animationFrames()[0]?.figures[0]?.figure.joints[0]?.x).toBe(0);
  });

  it('starts a blank animation on a white empty stage', () => {
    const fixture = TestBed.createComponent(App);
    const app = getEditor(fixture.componentInstance);
    fixture.detectChanges();

    const createBlank = fixture.nativeElement.querySelector(
      'button[aria-label="New blank animation"]',
    ) as HTMLButtonElement;
    createBlank.click();
    fixture.detectChanges();

    const stage = fixture.nativeElement.querySelector('.animation-stage') as HTMLElement;
    const canvas = stage.querySelector('svg[role="img"]');
    expect(app.animationFrames()).toHaveLength(1);
    expect(app.animationFrames()[0]?.figures).toHaveLength(0);
    expect(stage).toBeTruthy();
    expect(canvas?.querySelectorAll('line, circle')).toHaveLength(0);
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

  it('imports several figures into the current frame', async () => {
    const fixture = TestBed.createComponent(App);
    const app = getEditor(fixture.componentInstance);
    await app.importFigures([
      figureFile(simpleFigure, 'first.json'),
      figureFile({ ...simpleFigure, name: 'Second figure' }, 'second.json'),
    ]);
    fixture.detectChanges();

    expect(app.animationFrames()[0]?.figures).toHaveLength(2);
    expect(fixture.nativeElement.querySelectorAll('svg[role="img"] line')).toHaveLength(2);
    expect(
      fixture.nativeElement.querySelector('button[aria-label="Select figure Second figure"]'),
    ).toBeTruthy();

    const positionX = fixture.nativeElement.querySelector(
      'input[aria-label="Position X"]',
    ) as HTMLInputElement;
    positionX.value = '30';
    positionX.dispatchEvent(new Event('input'));

    expect(app.animationFrames()[0]?.figures[0]?.figure.joints[0]?.x).toBe(0);
    expect(app.animationFrames()[0]?.figures[1]?.figure.joints[0]?.x).toBe(30);
  });

  it('gives duplicate imported figure layers unique names', async () => {
    const fixture = TestBed.createComponent(App);
    const app = getEditor(fixture.componentInstance);
    await app.importFigures([
      figureFile(simpleFigure, 'first.json'),
      figureFile(simpleFigure, 'second.json'),
      figureFile(simpleFigure, 'third.json'),
    ]);

    expect(app.currentScene()?.figures.map(({ figure }) => figure.name)).toEqual([
      'Test figure',
      'Test figure 2',
      'Test figure 3',
    ]);
  });

  it('reorders figure layers and updates canvas stacking', async () => {
    const fixture = TestBed.createComponent(App);
    const app = getEditor(fixture.componentInstance);
    const figures = [
      {
        ...simpleFigure,
        name: 'Back',
        segments: [{ ...simpleFigure.segments[0]!, color: '#111111' }],
      },
      {
        ...simpleFigure,
        name: 'Middle',
        segments: [{ ...simpleFigure.segments[0]!, color: '#222222' }],
      },
      {
        ...simpleFigure,
        name: 'Front',
        segments: [{ ...simpleFigure.segments[0]!, color: '#333333' }],
      },
    ];
    await app.importFigures(figures.map((figure, index) => figureFile(figure, `${index}.json`)));
    app.addFrame();
    app.selectFrame(1);
    fixture.detectChanges();

    const moveForward = fixture.nativeElement.querySelector(
      'button[aria-label="Move Back forward"]',
    ) as HTMLButtonElement;
    moveForward.click();
    fixture.detectChanges();

    expect(app.currentScene()?.figures.map(({ figure }) => figure.name)).toEqual([
      'Middle',
      'Back',
      'Front',
    ]);
    expect(app.animationFrames()[1]?.figures.map(({ figure }) => figure.name)).toEqual([
      'Middle',
      'Back',
      'Front',
    ]);
    expect(app.selectedLayer()?.figure.name).toBe('Back');
    const root = fixture.nativeElement as HTMLElement;
    expect(
      [...root.querySelectorAll<SVGLineElement>('svg[role="img"] line')].map((line) =>
        line.getAttribute('stroke'),
      ),
    ).toEqual(['#222222', '#111111', '#333333']);

    app.undo();
    expect(app.currentScene()?.figures.map(({ figure }) => figure.name)).toEqual([
      'Back',
      'Middle',
      'Front',
    ]);
  });

  it('reorders figure layers by dragging the full layer row', async () => {
    const fixture = TestBed.createComponent(App);
    const app = getEditor(fixture.componentInstance);
    await app.importFigures([
      figureFile({ ...simpleFigure, name: 'Back' }, 'back.json'),
      figureFile({ ...simpleFigure, name: 'Middle' }, 'middle.json'),
      figureFile({ ...simpleFigure, name: 'Front' }, 'front.json'),
    ]);
    fixture.detectChanges();

    const root = fixture.nativeElement as HTMLElement;
    const source = root
      .querySelector<HTMLButtonElement>('button[aria-label="Select figure Front"]')
      ?.closest<HTMLElement>('[draggable="true"]');
    const target = root
      .querySelector<HTMLButtonElement>('button[aria-label="Select figure Back"]')
      ?.closest<HTMLElement>('[draggable="true"]');
    source?.dispatchEvent(new Event('dragstart'));
    target?.dispatchEvent(new Event('drop'));

    expect(app.currentScene()?.figures.map(({ figure }) => figure.name)).toEqual([
      'Front',
      'Back',
      'Middle',
    ]);
    expect(app.selectedLayer()?.figure.name).toBe('Front');
  });

  it('adds an imported figure from the current animation frame forward', async () => {
    const fixture = TestBed.createComponent(App);
    const app = getEditor(fixture.componentInstance);
    await app.importFigure(figureFile(simpleFigure, 'first.json'));
    app.addFrame();
    app.addFrame();
    app.currentFrame.set(2);

    await app.importFigure(figureFile({ ...simpleFigure, name: 'Late figure' }, 'late.json'));

    expect(app.animationFrames()[0]?.figures.map(({ figure }) => figure.name)).toEqual([
      'Test figure',
    ]);
    expect(app.animationFrames()[1]?.figures.map(({ figure }) => figure.name)).toEqual([
      'Test figure',
      'Late figure',
    ]);
    expect(app.animationFrames()[2]?.figures.map(({ figure }) => figure.name)).toEqual([
      'Test figure',
      'Late figure',
    ]);
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

  it('runs editor commands from the application menus', () => {
    const fixture = TestBed.createComponent(App);
    const app = getEditor(fixture.componentInstance);
    fixture.detectChanges();

    menu(fixture.nativeElement, 'File').querySelector<HTMLButtonElement>('button')?.click();
    fixture.detectChanges();
    expect(app.animationFrames()).toHaveLength(1);

    const animation = menu(fixture.nativeElement, 'Animation');
    const duplicate = [...animation.querySelectorAll<HTMLButtonElement>('button')].find(
      ({ textContent }) => textContent?.includes('Duplicate frame'),
    );
    duplicate?.click();
    fixture.detectChanges();
    expect(app.animationFrames()).toHaveLength(2);

    const view = menu(fixture.nativeElement, 'View');
    const controls = [...view.querySelectorAll<HTMLButtonElement>('button')].find(
      ({ textContent }) => textContent?.includes('Show joint controls'),
    );
    controls?.click();
    fixture.detectChanges();
    expect(controls?.textContent).toContain('Hide joint controls');

    menu(fixture.nativeElement, 'Help').querySelector<HTMLButtonElement>('button')?.click();
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('dialog')).toBeTruthy();
  });

  it('keeps figure transforms contextual and customizes the workspace', () => {
    const fixture = TestBed.createComponent(App);
    const app = getEditor(fixture.componentInstance);
    const workspace = getWorkspace(fixture.componentInstance);
    app.animationFrames.set([sceneFrame(simpleFigure)]);
    fixture.detectChanges();

    const root = fixture.nativeElement as HTMLElement;
    expect(root.querySelector('app-canvas-toolbar [aria-label*="Flip"]')).toBeNull();
    expect(menu(root, 'Edit').textContent).not.toContain('Flip X');
    expect(root.querySelector('app-inspector [aria-label="Flip figure X"]')).toBeTruthy();

    const view = menu(root, 'View');
    const projectToggle = [...view.querySelectorAll<HTMLInputElement>('input')].find((input) =>
      input.parentElement?.textContent?.includes('Project / Outliner'),
    );
    projectToggle?.click();
    fixture.detectChanges();
    expect(workspace.isVisible('project')).toBe(false);
    expect(root.querySelector('app-project-sidebar')).toBeNull();
    expect(app.animationFrames()).toHaveLength(1);

    const focusCanvas = [...view.querySelectorAll<HTMLButtonElement>('button')].find(
      ({ textContent }) => textContent?.includes('Focus Canvas'),
    );
    focusCanvas?.click();
    fixture.detectChanges();
    expect(root.querySelector('app-scene-strip')).toBeNull();
    expect(root.querySelector('app-timeline')).toBeNull();
    expect(root.querySelector('app-inspector')).toBeNull();

    const reset = [...view.querySelectorAll<HTMLButtonElement>('button')].find(({ textContent }) =>
      textContent?.includes('Reset Workspace'),
    );
    reset?.click();
    fixture.detectChanges();
    expect(workspace.layout()).toEqual({
      project: true,
      sceneStrip: true,
      timeline: true,
      inspector: true,
    });
    expect(root.querySelector('app-project-sidebar')).toBeTruthy();
    expect(app.animationFrames()).toHaveLength(1);
  });

  it('zooms and pans the viewport without moving the figure', () => {
    const fixture = TestBed.createComponent(App);
    const app = getEditor(fixture.componentInstance);
    const viewport = getViewport(fixture.componentInstance);
    app.animationFrames.set([sceneFrame(simpleFigure)]);
    fixture.detectChanges();
    const thumbnail = fixture.nativeElement.querySelector(
      'svg[data-frame-preview]',
    ) as SVGSVGElement;
    expect(thumbnail.getAttribute('viewBox')).toBe('-320 -180 640 360');

    const zoomOut = fixture.nativeElement.querySelector(
      'button[aria-label="Zoom out"]',
    ) as HTMLButtonElement;
    zoomOut.click();
    zoomOut.click();
    zoomOut.click();
    zoomOut.click();
    expect(viewport.zoom()).toBe(25);
    fixture.detectChanges();
    expect(thumbnail.getAttribute('viewBox')).toBe('-320 -180 640 360');

    (
      fixture.nativeElement.querySelector(
        'button[aria-label="Pan canvas right"]',
      ) as HTMLButtonElement
    ).click();
    (
      fixture.nativeElement.querySelector(
        'button[aria-label="Pan canvas left"]',
      ) as HTMLButtonElement
    ).click();
    expect(viewport.pan()).toEqual({ x: 0, y: 0 });

    (
      fixture.nativeElement.querySelector('button[aria-label="Pan canvas"]') as HTMLButtonElement
    ).click();
    fixture.detectChanges();
    const canvas = fixture.nativeElement.querySelector('svg[role="img"]') as SVGSVGElement;
    canvas.setPointerCapture = () => undefined;
    canvas.dispatchEvent(
      new PointerEvent('pointerdown', { bubbles: true, clientX: 10, clientY: 20, pointerId: 1 }),
    );
    canvas.dispatchEvent(
      new PointerEvent('pointermove', { bubbles: true, clientX: 50, clientY: 60, pointerId: 1 }),
    );
    canvas.dispatchEvent(new PointerEvent('pointerup', { bubbles: true, pointerId: 1 }));

    expect(viewport.controlMode()).toBe('pan');
    expect(viewport.pan()).toEqual({ x: 40, y: 40 });
    expect(app.animationFrames()[0]?.figures[0]?.figure.joints[0]).toMatchObject({
      x: 0,
      y: 0,
    });
    fixture.detectChanges();
    const pannedViewBox = canvas.getAttribute('viewBox')?.split(' ').map(Number);
    expect(canvas.style.transform).toBe('');
    expect(pannedViewBox?.[2]).toBe(2560);
    expect(pannedViewBox?.[3]).toBe(1440);

    (
      fixture.nativeElement.querySelector('button[aria-label="Fit canvas"]') as HTMLButtonElement
    ).click();
    fixture.detectChanges();
    expect(viewport.zoom()).toBe(100);
    expect(viewport.pan()).toEqual({ x: 0, y: 0 });
    expect(canvas.getAttribute('viewBox')).toBe('-320 -180 640 360');

    const zoomIn = fixture.nativeElement.querySelector(
      'button[aria-label="Zoom in"]',
    ) as HTMLButtonElement;
    zoomIn.click();
    zoomIn.click();
    zoomIn.click();
    zoomIn.click();
    zoomIn.click();
    expect(viewport.zoom()).toBe(200);
    fixture.detectChanges();
    expect(thumbnail.getAttribute('viewBox')).toBe('-320 -180 640 360');
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

  it('applies background color and image to every frame', async () => {
    const fixture = TestBed.createComponent(App);
    const app = getEditor(fixture.componentInstance);
    app.animationFrames.set([sceneFrame(simpleFigure), sceneFrame(simpleFigure)]);
    fixture.detectChanges();

    const color = fixture.nativeElement.querySelector(
      'input[aria-label="Background color"]',
    ) as HTMLInputElement;
    color.value = '#123456';
    color.dispatchEvent(new Event('input'));
    await app.importBackground(new File(['background'], 'backdrop.png', { type: 'image/png' }));
    fixture.detectChanges();

    const fit = fixture.nativeElement.querySelector(
      'select[aria-label="Background fit"]',
    ) as HTMLSelectElement;
    fit.value = 'contain';
    fit.dispatchEvent(new Event('change'));
    const scale = fixture.nativeElement.querySelector(
      'input[aria-label="Background scale"]',
    ) as HTMLInputElement;
    scale.value = '150';
    scale.dispatchEvent(new Event('input'));
    const positionX = fixture.nativeElement.querySelector(
      'input[aria-label="Background position X"]',
    ) as HTMLInputElement;
    positionX.value = '24';
    positionX.dispatchEvent(new Event('input'));
    const positionY = fixture.nativeElement.querySelector(
      'input[aria-label="Background position Y"]',
    ) as HTMLInputElement;
    positionY.value = '-12';
    positionY.dispatchEvent(new Event('input'));
    fixture.detectChanges();

    expect(app.animationFrames().every(({ background }) => background.color === '#123456')).toBe(
      true,
    );
    expect(
      app.animationFrames().every(({ background }) => background.imageName === 'backdrop.png'),
    ).toBe(true);
    expect(
      app
        .animationFrames()
        .every(
          ({ background }) =>
            background.fit === 'contain' &&
            background.scale === 150 &&
            background.positionX === 24 &&
            background.positionY === -12,
        ),
    ).toBe(true);
    const image = fixture.nativeElement.querySelector('.animation-stage img') as HTMLImageElement;
    expect(image.style.objectFit).toBe('contain');
    expect(image.style.transform).toBe('translate(24px, -12px) scale(1.5)');

    const root = fixture.nativeElement as HTMLElement;
    const reset = [...root.querySelectorAll<HTMLButtonElement>('button')].find(
      ({ textContent }) => textContent?.trim() === 'Reset',
    );
    reset?.click();
    expect(app.currentBackground()).toMatchObject({
      fit: 'cover',
      scale: 100,
      positionX: 0,
      positionY: 0,
    });
  });
});

function moveRoot(figure: StickFigure, x: number): StickFigure {
  return {
    ...figure,
    joints: figure.joints.map((joint) => (joint.id === 'root' ? { ...joint, x } : joint)),
  };
}

function sceneFrame(figure: StickFigure): SceneFrame {
  return createSceneFrame(createFigureLayer('figure-1', figure));
}

function figureFile(figure: StickFigure, name: string): File {
  return new File([JSON.stringify(figure)], name, { type: 'application/json' });
}

function getEditor(component: App): EditorDocumentStore {
  return (component as unknown as { editor: EditorDocumentStore }).editor;
}

function getViewport(component: App): EditorViewportStore {
  return (component as unknown as { viewport: EditorViewportStore }).viewport;
}

function getWorkspace(component: App): EditorWorkspaceStore {
  return (component as unknown as { workspace: EditorWorkspaceStore }).workspace;
}

function menu(root: HTMLElement, name: string): HTMLDetailsElement {
  const result = [...root.querySelectorAll<HTMLDetailsElement>('details')].find(
    (details) => details.querySelector('summary')?.textContent?.trim() === name,
  );
  if (!result) {
    throw new Error(`Menu ${name} not found.`);
  }
  return result;
}
