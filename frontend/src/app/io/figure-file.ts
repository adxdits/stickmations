import type { StickFigure } from '@stickmations/engine';
import { sanitizeDownloadFileName } from './file-download';

export const FIGURE_FILE_EXTENSION = '.json';

/**
 * Writes the figure in the exact shape `parseStickFigureJson` reads, so a saved file imports again
 * through "Import stick figures…". Optional properties are omitted rather than written as null,
 * which the parser rejects.
 */
export function serializeFigureFile(figure: StickFigure): string {
  return `${JSON.stringify(figureFileValue(figure), null, 2)}\n`;
}

export function figureFileName(suggestedName: string): string {
  return sanitizeDownloadFileName(suggestedName, 'Untitled figure', FIGURE_FILE_EXTENSION);
}

function figureFileValue(figure: StickFigure): Record<string, unknown> {
  return {
    version: 1,
    name: figure.name,
    joints: figure.joints.map((joint) => ({
      id: joint.id,
      x: joint.x,
      y: joint.y,
      radius: joint.radius,
      color: joint.color,
      ...defined('isStatic', joint.isStatic),
      ...defined('isStretchy', joint.isStretchy),
    })),
    segments: figure.segments.map((segment) => ({
      id: segment.id,
      from: segment.from,
      to: segment.to,
      width: segment.width,
      color: segment.color,
      ...defined('shape', segment.shape),
      ...defined('hollow', segment.hollow),
      ...defined('drawOrder', segment.drawOrder),
      ...defined('halfShape', segment.halfShape),
      ...defined('expandShapeByWidth', segment.expandShapeByWidth),
      ...defined('outlineColor', segment.outlineColor),
      ...defined('triangleType', segment.triangleType),
      ...defined('triangleFlipped', segment.triangleFlipped),
      ...defined('triangleUpsideDown', segment.triangleUpsideDown),
      ...defined('startWidth', segment.startWidth),
      ...defined('endWidth', segment.endWidth),
      ...defined('polygonSides', segment.polygonSides),
    })),
    ...(figure.fills?.length
      ? {
          fills: figure.fills.map((fill) => ({
            id: fill.id,
            jointIds: [...fill.jointIds],
            color: fill.color,
            ...defined('drawOrder', fill.drawOrder),
          })),
        }
      : {}),
  };
}

function defined<T>(key: string, value: T | undefined): Record<string, T> {
  return value === undefined ? {} : { [key]: value };
}
