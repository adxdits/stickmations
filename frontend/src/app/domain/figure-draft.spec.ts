import { parseStickFigure, type StickFigure } from '@stickmations/engine';
import { describe, expect, it } from 'vitest';
import {
  addJoint,
  connectJoints,
  createEmptyFigure,
  deleteJoint,
  deleteSegment,
  isSavableFigure,
  moveJoint,
  renameFigure,
  updateJoint,
  updateSegment,
} from './figure-draft';

function torso(): { figure: StickFigure; hipId: string; chestId: string } {
  const hip = addJoint(createEmptyFigure(), { x: 0, y: 0 });
  const chest = addJoint(hip.figure, { x: 0, y: 40 }, { parentId: hip.jointId });
  return { figure: chest.figure, hipId: hip.jointId, chestId: chest.jointId };
}

describe('figure draft', () => {
  it('starts empty and is not savable until a joint exists', () => {
    const figure = createEmptyFigure();

    expect(figure.joints).toEqual([]);
    expect(isSavableFigure(figure)).toBe(false);
    expect(isSavableFigure(addJoint(figure, { x: 0, y: 0 }).figure)).toBe(true);
  });

  it('connects each new joint to its parent so a limb is drawn click by click', () => {
    const { figure, hipId, chestId } = torso();

    expect(figure.joints).toHaveLength(2);
    expect(figure.segments).toHaveLength(1);
    expect(figure.segments[0]).toMatchObject({ from: hipId, to: chestId });
  });

  it('adds an unconnected joint when there is no parent', () => {
    const { figure } = addJoint(createEmptyFigure(), { x: 5, y: 5 });

    expect(figure.segments).toEqual([]);
  });

  it('ignores a parent id that no longer exists', () => {
    const { figure } = addJoint(createEmptyFigure(), { x: 0, y: 0 }, { parentId: 'missing' });

    expect(figure.joints).toHaveLength(1);
    expect(figure.segments).toEqual([]);
  });

  it('refuses to connect a joint to itself or to duplicate an existing segment', () => {
    const { figure, hipId, chestId } = torso();

    expect(connectJoints(figure, hipId, hipId)).toBe(figure);
    expect(connectJoints(figure, hipId, chestId)).toBe(figure);
    expect(connectJoints(figure, chestId, hipId)).toBe(figure);
    expect(connectJoints(figure, hipId, 'missing')).toBe(figure);
  });

  it('removes the segments that referenced a deleted joint', () => {
    const { figure, hipId } = torso();

    const pruned = deleteJoint(figure, hipId);

    expect(pruned.joints).toHaveLength(1);
    expect(pruned.segments).toEqual([]);
    expect(() => parseStickFigure(JSON.parse(JSON.stringify(pruned)))).not.toThrow();
  });

  it('drops fills that referenced a deleted joint', () => {
    const { figure, hipId, chestId } = torso();
    const third = addJoint(figure, { x: 20, y: 20 });
    const filled: StickFigure = {
      ...third.figure,
      fills: [{ id: 'f1', jointIds: [hipId, chestId, third.jointId], color: '#FFFFFF' }],
    };

    expect(deleteJoint(filled, hipId).fills).toBeUndefined();
    expect(deleteJoint(filled, 'missing')).toBe(filled);
  });

  it('reuses ids freed by deletion without colliding with survivors', () => {
    const { figure, hipId } = torso();
    const third = addJoint(figure, { x: 9, y: 9 });

    const afterDelete = deleteJoint(third.figure, hipId);
    const replacement = addJoint(afterDelete, { x: 1, y: 1 });

    const ids = replacement.figure.joints.map(({ id }) => id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('edits joint and segment properties in place', () => {
    const { figure, hipId } = torso();

    const moved = moveJoint(figure, hipId, { x: 12, y: -3 });
    expect(moved.joints[0]).toMatchObject({ x: 12, y: -3 });

    const styled = updateJoint(moved, hipId, { radius: 9, color: '#FF00FF' });
    expect(styled.joints[0]).toMatchObject({ radius: 9, color: '#FF00FF' });

    const segmentId = figure.segments[0]!.id;
    const reshaped = updateSegment(styled, segmentId, { shape: 'circle', width: 20 });
    expect(reshaped.segments[0]).toMatchObject({ shape: 'circle', width: 20 });
  });

  it('leaves the figure untouched when an edit targets something missing', () => {
    const { figure } = torso();

    expect(moveJoint(figure, 'missing', { x: 1, y: 1 })).toBe(figure);
    expect(updateJoint(figure, 'missing', { radius: 2 })).toBe(figure);
    expect(updateSegment(figure, 'missing', { width: 2 })).toBe(figure);
  });

  it('deletes a segment without touching its joints', () => {
    const { figure } = torso();

    const pruned = deleteSegment(figure, figure.segments[0]!.id);

    expect(pruned.segments).toEqual([]);
    expect(pruned.joints).toHaveLength(2);
  });

  it('falls back to a default name for blank input', () => {
    expect(renameFigure(createEmptyFigure(), '   ').name).toBe('Untitled figure');
    expect(renameFigure(createEmptyFigure(), ' Runner ').name).toBe('Runner');
  });
});
