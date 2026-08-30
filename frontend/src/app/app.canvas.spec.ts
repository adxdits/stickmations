import { TestBed } from '@angular/core/testing';
import { App } from './app';
import {
  configureAppTestBed,
  getEditor,
  getViewport,
  moveRoot,
  sceneFrame,
  simpleFigure,
} from './testing/app-test-harness';

describe('Canvas editing', () => {
  beforeEach(async () => {
    await configureAppTestBed();
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
    expect(viewport.zoom()).toBe(10);
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
    expect(pannedViewBox?.[2]).toBe(6400);
    expect(pannedViewBox?.[3]).toBe(3600);

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
    expect(viewport.zoom()).toBe(225);
    fixture.detectChanges();
    expect(thumbnail.getAttribute('viewBox')).toBe('-320 -180 640 360');

    viewport.fitCamera({ positionX: 100, positionY: 0, width: 320, height: 180, rotation: 0 });
    expect(viewport.zoom()).toBe(182);
    expect(viewport.pan()).toEqual({ x: -100, y: 0 });

    viewport.fitCanvas();
    fixture.detectChanges();
    canvas.dispatchEvent(
      new WheelEvent('wheel', { bubbles: true, cancelable: true, deltaY: -100 }),
    );
    expect(viewport.zoom()).toBe(110);

    viewport.fitCanvas();
    viewport.controlMode.set('none');
    fixture.detectChanges();
    document.dispatchEvent(
      new KeyboardEvent('keydown', { bubbles: true, cancelable: true, code: 'Space', key: ' ' }),
    );
    canvas.dispatchEvent(
      new PointerEvent('pointerdown', { bubbles: true, clientX: 10, clientY: 20, pointerId: 2 }),
    );
    canvas.dispatchEvent(
      new PointerEvent('pointermove', { bubbles: true, clientX: 35, clientY: 50, pointerId: 2 }),
    );
    canvas.dispatchEvent(new PointerEvent('pointerup', { bubbles: true, pointerId: 2 }));
    document.dispatchEvent(new KeyboardEvent('keyup', { bubbles: true, code: 'Space', key: ' ' }));
    expect(viewport.controlMode()).toBe('none');
    expect(viewport.pan()).toEqual({ x: 25, y: 30 });
  });
});
