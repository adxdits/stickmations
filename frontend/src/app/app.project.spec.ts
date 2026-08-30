import { TestBed } from '@angular/core/testing';
import { App } from './app';
import {
  configureAppTestBed,
  figureFile,
  getEditor,
  sceneFrame,
  simpleFigure,
} from './testing/app-test-harness';

describe('Project assets and layers', () => {
  beforeEach(async () => {
    await configureAppTestBed();
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
