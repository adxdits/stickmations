import { TestBed } from '@angular/core/testing';
import { describe, expect, it } from 'vitest';
import { createFigurePreview } from '../rendering/figure-preview';
import { EditorFigureStore } from './editor-figure.store';

function createStore(): EditorFigureStore {
  TestBed.configureTestingModule({});
  const store = TestBed.inject(EditorFigureStore);
  store.open();
  return store;
}

/** Draws hip → chest → head by clicking, the way the draw tool chains from the selected joint. */
function drawSpine(store: EditorFigureStore): void {
  store.clickCanvas({ x: 0, y: 0 });
  store.clickCanvas({ x: 0, y: 40 });
  store.clickCanvas({ x: 0, y: 70 });
}

describe('EditorFigureStore', () => {
  it('opens on a blank figure that cannot be saved yet', () => {
    const store = createStore();

    expect(store.figure().joints).toEqual([]);
    expect(store.canSave()).toBe(false);
    expect(store.tool()).toBe('draw');
  });

  it('chains each drawn joint to the previous one', () => {
    const store = createStore();

    drawSpine(store);

    expect(store.figure().joints).toHaveLength(3);
    expect(store.figure().segments).toHaveLength(2);
    expect(store.canSave()).toBe(true);
  });

  it('applies the current shape defaults to new segments', () => {
    const store = createStore();
    store.segmentStyle.set({ shape: 'filled-circle', width: 22, color: '#FF8800' });

    store.clickCanvas({ x: 0, y: 0 });
    store.clickCanvas({ x: 0, y: 30 });

    expect(store.figure().segments[0]).toMatchObject({
      shape: 'filled-circle',
      width: 22,
      color: '#FF8800',
    });
  });

  it('does not add joints when a non-drawing tool clicks empty canvas', () => {
    const store = createStore();
    store.clickCanvas({ x: 0, y: 0 });
    store.setTool('select');

    store.clickCanvas({ x: 50, y: 50 });

    expect(store.figure().joints).toHaveLength(1);
    expect(store.selection()).toBeNull();
  });

  it('links two joints with the connect tool in two clicks', () => {
    const store = createStore();
    drawSpine(store);
    const [hip, , head] = store.figure().joints;
    store.setTool('connect');

    store.clickJoint(hip!.id);
    expect(store.connectFrom()).toBe(hip!.id);
    store.clickJoint(head!.id);

    expect(store.connectFrom()).toBeNull();
    expect(store.figure().segments).toHaveLength(3);
  });

  it('erases a joint and the segments that used it', () => {
    const store = createStore();
    drawSpine(store);
    const chestId = store.figure().joints[1]!.id;
    store.setTool('erase');

    store.clickJoint(chestId);

    expect(store.figure().joints).toHaveLength(2);
    expect(store.figure().segments).toEqual([]);
    expect(store.selection()).toBeNull();
  });

  it('undoes and redoes a drawing step', () => {
    const store = createStore();
    drawSpine(store);

    store.undo();
    expect(store.figure().joints).toHaveLength(2);

    store.redo();
    expect(store.figure().joints).toHaveLength(3);
    expect(store.canRedo()).toBe(false);
  });

  it('collapses one drag into a single undo entry', () => {
    const store = createStore();
    drawSpine(store);
    const jointId = store.figure().joints[2]!.id;

    store.beginEdit();
    store.dragJoint(jointId, { x: 5, y: 70 });
    store.dragJoint(jointId, { x: 10, y: 70 });
    store.dragJoint(jointId, { x: 15, y: 70 });
    store.endEdit();

    store.undo();

    expect(store.figure().joints[2]).toMatchObject({ x: 0, y: 70 });
  });

  it('clears a selection that undo removed from the figure', () => {
    const store = createStore();
    drawSpine(store);

    expect(store.selection()).not.toBeNull();
    store.undo();

    expect(store.selection()).toBeNull();
  });

  it('edits the selected joint and segment through the properties rail', () => {
    const store = createStore();
    drawSpine(store);
    const segmentId = store.figure().segments[0]!.id;

    store.editJoint({ radius: 11 });
    expect(store.selectedJoint()).toMatchObject({ radius: 11 });

    store.clickSegment(segmentId);
    store.editSegment({ shape: 'circle', width: 30 });
    expect(store.selectedSegment()).toMatchObject({ shape: 'circle', width: 30 });
  });

  it('carries a recolored shape into what the renderer draws', () => {
    const store = createStore();
    drawSpine(store);
    store.clickSegment(store.figure().segments[0]!.id);

    store.editSegment({ color: '#FF0000' });

    const drawable = createFigurePreview(store.figure()).drawables[0]!;
    expect(JSON.stringify(drawable)).toContain('#FF0000');
  });

  it('keeps a recolored joint on the figure it saves', () => {
    const store = createStore();
    drawSpine(store);
    const jointId = store.selectedJoint()!.id;

    store.editJoint({ color: '#00FF00' });

    expect(store.figure().joints.find(({ id }) => id === jointId)?.color).toBe('#00FF00');
  });

  it('starts over when reopened', () => {
    const store = createStore();
    drawSpine(store);

    store.open();

    expect(store.figure().joints).toEqual([]);
    expect(store.canUndo()).toBe(false);
    expect(store.selection()).toBeNull();
  });
});
