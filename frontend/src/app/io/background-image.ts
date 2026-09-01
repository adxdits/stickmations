const SUPPORTED_BACKGROUND_IMAGE_PREFIXES = new Set([
  'data:image/avif;base64',
  'data:image/bmp;base64',
  'data:image/gif;base64',
  'data:image/jpeg;base64',
  'data:image/png;base64',
  'data:image/vnd.microsoft.icon;base64',
  'data:image/webp;base64',
  'data:image/x-icon;base64',
]);

export function requireSafeBackgroundImageDataUrl(
  value: unknown,
  property = 'Background image',
): string {
  if (typeof value !== 'string' || value.length === 0) {
    throw new Error(`${property} must be an embedded supported raster image.`);
  }

  const separator = value.indexOf(',');
  const prefix = separator < 0 ? '' : value.slice(0, separator).toLowerCase();
  const payload = separator < 0 ? '' : value.slice(separator + 1);
  if (!SUPPORTED_BACKGROUND_IMAGE_PREFIXES.has(prefix) || !isBase64(payload)) {
    throw new Error(`${property} must be an embedded supported raster image.`);
  }
  return value;
}

function isBase64(value: string): boolean {
  if (value.length === 0 || value.length % 4 !== 0) {
    return false;
  }

  const padding = value.endsWith('==') ? 2 : value.endsWith('=') ? 1 : 0;
  for (let index = 0; index < value.length - padding; index += 1) {
    const code = value.charCodeAt(index);
    const isBase64Character =
      (code >= 0x41 && code <= 0x5a) ||
      (code >= 0x61 && code <= 0x7a) ||
      (code >= 0x30 && code <= 0x39) ||
      code === 0x2b ||
      code === 0x2f;
    if (!isBase64Character) {
      return false;
    }
  }
  return true;
}
