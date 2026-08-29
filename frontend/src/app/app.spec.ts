import { TestBed } from '@angular/core/testing';
import { App } from './app';

describe('App', () => {
  beforeEach(async () => {
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
  });

  it('should render an imported figure as SVG', () => {
    const fixture = TestBed.createComponent(App);
    const app = fixture.componentInstance as unknown as {
      importedFigure: { set: (figure: object) => void };
    };
    app.importedFigure.set({
      version: 1,
      name: 'Test figure',
      joints: [
        { id: 'root', x: 0, y: 0, radius: 5, color: '#000000' },
        { id: 'hand', x: 100, y: 50, radius: 5, color: '#000000' },
      ],
      segments: [{ id: 'arm', from: 'root', to: 'hand', width: 8, color: '#ff0000' }],
    });
    fixture.detectChanges();

    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelector('svg')).toBeTruthy();
    expect(compiled.querySelectorAll('line')).toHaveLength(1);
    expect(compiled.querySelectorAll('circle')).toHaveLength(0);
  });

  it('renders circle nodes from their diameter with an upright Y axis', () => {
    const fixture = TestBed.createComponent(App);
    const app = fixture.componentInstance as unknown as {
      importedFigure: { set: (figure: object) => void };
    };
    app.importedFigure.set({
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
    });
    fixture.detectChanges();

    const circle = fixture.nativeElement.querySelector('svg circle') as SVGCircleElement;
    expect(circle.getAttribute('cy')).toBe('-50');
    expect(circle.getAttribute('r')).toBe('50');
    expect(circle.getAttribute('fill')).toBe('#ff0000');
  });

  it('provides figure and editable-joint controls', () => {
    const fixture = TestBed.createComponent(App);
    const app = fixture.componentInstance as unknown as {
      importedFigure: { set: (figure: object) => void };
    };
    app.importedFigure.set({
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
        { id: 'head-shape', from: 'neck', to: 'head', width: 4, color: '#000000', shape: 'circle' },
        { id: 'left-arm', from: 'root', to: 'left-hand', width: 4, color: '#000000' },
        { id: 'right-arm', from: 'root', to: 'right-hand', width: 4, color: '#000000' },
        { id: 'left-leg', from: 'root', to: 'left-foot', width: 4, color: '#000000' },
        { id: 'right-leg', from: 'root', to: 'right-foot', width: 4, color: '#000000' },
      ],
    });
    fixture.detectChanges();

    const compiled = fixture.nativeElement as HTMLElement;
    const mode = compiled.querySelector('select') as HTMLSelectElement;
    mode.value = 'joints';
    mode.dispatchEvent(new Event('change'));
    fixture.detectChanges();

    expect(compiled.querySelector('rect[aria-label="Move figure"]')).toBeTruthy();
    expect(compiled.querySelectorAll('circle[role="button"]')).toHaveLength(5);

    const center = compiled.querySelector('rect[aria-label="Move figure"]') as SVGRectElement;
    center.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight' }));
    fixture.detectChanges();
    expect(center.getAttribute('x')).toBe('-1');
  });
});
