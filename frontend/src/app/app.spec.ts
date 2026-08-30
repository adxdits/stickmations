import { TestBed } from '@angular/core/testing';
import { App } from './app';
import {
  configureAppTestBed,
  getEditor,
  getWorkspace,
  menu,
  sceneFrame,
  simpleFigure,
} from './testing/app-test-harness';

describe('App shell', () => {
  beforeEach(async () => {
    await configureAppTestBed();
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
    expect(workspace.canvasFocused()).toBe(true);
    expect(workspace.layout().project).toBe(false);
    expect(root.querySelector('app-application-menu-bar')).toBeNull();
    expect(root.querySelector('footer')).toBeNull();
    expect(root.querySelector('.animation-stage-expanded')).toBeTruthy();
    expect(root.querySelector('app-scene-strip')).toBeNull();
    expect(root.querySelector('app-timeline')).toBeNull();
    expect(root.querySelector('app-inspector')).toBeNull();

    root.querySelector<HTMLButtonElement>('button[aria-label="Restore workspace"]')?.click();
    fixture.detectChanges();
    expect(workspace.canvasFocused()).toBe(false);
    expect(workspace.layout().project).toBe(false);
    expect(root.querySelector('app-timeline')).toBeTruthy();

    const restoredView = menu(root, 'View');
    const reset = [...restoredView.querySelectorAll<HTMLButtonElement>('button')].find(
      ({ textContent }) => textContent?.includes('Reset Workspace'),
    );
    reset?.click();
    fixture.detectChanges();
    expect(workspace.canvasFocused()).toBe(false);
    expect(workspace.layout()).toEqual({
      project: true,
      sceneStrip: true,
      timeline: true,
      inspector: true,
    });
    expect(root.querySelector('app-project-sidebar')).toBeTruthy();
    expect(app.animationFrames()).toHaveLength(1);
  });
});
