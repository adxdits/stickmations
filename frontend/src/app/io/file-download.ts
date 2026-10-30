export function sanitizeDownloadFileName(
  suggestedName: string,
  fallbackName: string,
  extension: string,
): string {
  const name = suggestedName
    .replace(/[<>:"/|?*\u0000-\u001f]/g, '_')
    .replaceAll('\\', '_')
    .trim();
  const safeName = name || fallbackName;
  return safeName.toLowerCase().endsWith(extension.toLowerCase())
    ? safeName
    : `${safeName}${extension}`;
}

export function downloadBlob(
  document: Document,
  blob: Blob,
  fileName: string,
): string {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = fileName;
  link.click();
  URL.revokeObjectURL(url);
  return fileName;
}
