import { TestBed } from '@angular/core/testing';
import type { StickFigure } from '@stickmations/engine';
import { App } from '../app';
import { createFigureLayer, createSceneFrame, type SceneFrame } from '../domain/scene-frame';
import { EditorDocumentStore } from '../state/editor-document.store';
import { EditorViewportStore } from '../state/editor-viewport.store';
import { EditorWorkspaceStore } from '../state/editor-workspace.store';

export const simpleFigure: StickFigure = {
  version: 1,
  name: 'Test figure',
  joints: [
    { id: 'root', x: 0, y: 0, radius: 5, color: '#000000' },
    { id: 'hand', x: 100, y: 50, radius: 5, color: '#000000' },
  ],
  segments: [{ id: 'arm', from: 'root', to: 'hand', width: 8, color: '#ff0000' }],
};

export async function configureAppTestBed(): Promise<void> {
  globalThis.localStorage?.removeItem('stickmations.workspace-layout.v1');
  globalThis.localStorage?.removeItem('framation.workspace-layout.v1');
  await TestBed.configureTestingModule({ imports: [App] }).compileComponents();
}

export function moveRoot(figure: StickFigure, x: number): StickFigure {
  return {
    ...figure,
    joints: figure.joints.map((joint) => (joint.id === 'root' ? { ...joint, x } : joint)),
  };
}

export function sceneFrame(figure: StickFigure): SceneFrame {
  return createSceneFrame(createFigureLayer('figure-1', figure));
}

export function figureFile(figure: StickFigure, name: string): File {
  return new File([JSON.stringify(figure)], name, { type: 'application/json' });
}

export function getEditor(component: App): EditorDocumentStore {
  return (component as unknown as { editor: EditorDocumentStore }).editor;
}

export function getViewport(component: App): EditorViewportStore {
  return (component as unknown as { viewport: EditorViewportStore }).viewport;
}

export function getWorkspace(component: App): EditorWorkspaceStore {
  return (component as unknown as { workspace: EditorWorkspaceStore }).workspace;
}

export function menu(root: HTMLElement, name: string): HTMLDetailsElement {
  const result = [...root.querySelectorAll<HTMLDetailsElement>('details')].find(
    (details) => details.querySelector('summary')?.textContent?.trim() === name,
  );
  if (!result) {
    throw new Error(`Menu ${name} not found.`);
  }
  return result;
}
