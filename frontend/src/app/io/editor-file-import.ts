import { parseStickFigureJson, parseStickNodesFile, type StickFigure } from '@framation/engine';
import { requireSafeBackgroundImageDataUrl } from './background-image';

export const MAX_BACKGROUND_IMAGE_BYTES = 64 * 1024 * 1024;

export async function parseFigureFile(file: File): Promise<StickFigure> {
  return file.name.toLowerCase().endsWith('.nodes')
    ? parseStickNodesFile(await file.arrayBuffer(), file.name)
    : parseStickFigureJson(await file.text());
}

export function readBackgroundFileAsDataUrl(file: File): Promise<string> {
  if (file.size > MAX_BACKGROUND_IMAGE_BYTES) {
    return Promise.reject(new Error('Background images must be 64 MiB or smaller.'));
  }

  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.addEventListener('load', () => {
      if (typeof reader.result === 'string') {
        try {
          resolve(requireSafeBackgroundImageDataUrl(reader.result));
        } catch (error: unknown) {
          reject(error);
        }
      } else {
        reject(new Error('The background image could not be read.'));
      }
    });
    reader.addEventListener('error', () =>
      reject(new Error('The background image could not be read.')),
    );
    reader.readAsDataURL(file);
  });
}
