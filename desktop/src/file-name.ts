import { basename, extname } from 'node:path';

export function sanitizeFileName(
  suggestedName: string,
  fallbackName: string,
  extension: string,
): string {
  const fileName = basename(suggestedName)
    .replace(/[<>:"/|?*\u0000-\u001f]/g, '_')
    .replaceAll('\\', '_')
    .trim();
  return withExtension(fileName || fallbackName, extension);
}

export function withExtension(path: string, extension: string): string {
  return extname(path).toLowerCase() === extension.toLowerCase()
    ? path
    : `${path}${extension}`;
}
