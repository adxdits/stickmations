import { parseStickFigureJson, parseStickNodesFile, type StickFigure } from '@framation/engine';

export async function parseFigureFile(file: File): Promise<StickFigure> {
  return file.name.toLowerCase().endsWith('.nodes')
    ? parseStickNodesFile(await file.arrayBuffer(), file.name)
    : parseStickFigureJson(await file.text());
}

export function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.addEventListener('load', () => {
      if (typeof reader.result === 'string') {
        resolve(reader.result);
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
