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
    expect(compiled.querySelector('h1')?.textContent).toContain('Stickmations');
    expect(compiled.querySelector('header img[src*="app_logo_40.png"]')).toBeTruthy();
    expect(compiled.querySelector('img[src*="background_app.png"]')).toBeTruthy();
  });

  it('should render a stick-figure file input', () => {
    const fixture = TestBed.createComponent(App);
    fixture.detectChanges();
    const compiled = fixture.nativeElement as HTMLElement;
    const input = compiled.querySelector<HTMLInputElement>('input[type="file"][multiple]');

    expect(input).toBeTruthy();
    expect(input?.accept).toContain('.nodes');
    expect(input?.multiple).toBe(true);
  });

  it('migrates the legacy workspace layout to the Stickmations storage key', () => {
    const legacyLayout = {
      project: false,
      sceneStrip: true,
      timeline: false,
      inspector: true,
    };
    globalThis.localStorage.setItem(
      'framation.workspace-layout.v1',
      JSON.stringify(legacyLayout),
    );

    const fixture = TestBed.createComponent(App);
    const workspace = getWorkspace(fixture.componentInstance);

    expect(workspace.layout()).toEqual(legacyLayout);
    expect(globalThis.localStorage.getItem('stickmations.workspace-layout.v1')).toBe(
      JSON.stringify(legacyLayout),
    );
    expect(globalThis.localStorage.getItem('framation.workspace-layout.v1')).toBeNull();
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

    const root = fixture.nativeElement as HTMLElement;
    expect(
      menu(root, 'Help').querySelector<HTMLAnchorElement>(
        "a[href='https://stickmations.com/#news']",
      )?.textContent,
    ).toContain("What's new");
    expect(
      root.querySelector<HTMLAnchorElement>('a[aria-label="What\'s new"]')?.getAttribute('href'),
    ).toBe('https://stickmations.com/#news');
    menu(root, 'Help').querySelector<HTMLButtonElement>('button')?.click();
    fixture.detectChanges();
    const help = root.querySelector('dialog') as HTMLDialogElement;
    expect(help.textContent).toContain('Help');
    expect(help.textContent).toContain('adamalmounayar@hotmail.com');
    expect(
      [...help.querySelectorAll<HTMLAnchorElement>('a')].map((link) => link.getAttribute('href')),
    ).toEqual([
      'mailto:adamalmounayar@hotmail.com?subject=Stickmations%20contact%20or%20bug%20report',
      'https://buymeacoffee.com/adxdits',
    ]);
    expect(help.classList).toContain('relative');
    expect(help.classList).toContain('m-0');
    expect(help.parentElement?.classList).toContain('items-center');

    help.querySelector<HTMLButtonElement>('button[aria-label="Close Help"]')?.click();
    fixture.detectChanges();
    menu(root, 'About Us').querySelector<HTMLButtonElement>('button')?.click();
    fixture.detectChanges();
    const about = root.querySelector('dialog') as HTMLDialogElement;
    expect(about.textContent).toContain('About Stickmations');
    expect(about.querySelector('img[src*="app_logo_64.png"]')).toBeTruthy();
    expect(
      [...about.querySelectorAll<HTMLAnchorElement>('a')].map((link) => link.getAttribute('href')),
    ).toEqual([
      'https://discord.gg/5YQTaaC5W',
      'https://www.reddit.com/r/StickmationsOfficial/',
      'https://stickmations.com/',
    ]);
    expect(root.querySelector('button[aria-label="Help and bug reports"]')).toBeTruthy();
    expect(root.querySelector('button[aria-label="About Stickmations"]')).toBeTruthy();
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
