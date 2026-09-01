import { MAX_BACKGROUND_IMAGE_BYTES, readBackgroundFileAsDataUrl } from './editor-file-import';

describe('readBackgroundFileAsDataUrl', () => {
  it('reads a supported raster image as an embedded data URL', async () => {
    const file = new File([new Uint8Array([0x89, 0x50, 0x4e, 0x47])], 'background.png', {
      type: 'image/png',
    });

    await expect(readBackgroundFileAsDataUrl(file)).resolves.toBe('data:image/png;base64,iVBORw==');
  });

  it('rejects active image formats', async () => {
    const file = new File(['<svg xmlns="http://www.w3.org/2000/svg"/>'], 'background.svg', {
      type: 'image/svg+xml',
    });

    await expect(readBackgroundFileAsDataUrl(file)).rejects.toThrow(
      /embedded supported raster image/i,
    );
  });

  it('rejects oversized images before reading them', async () => {
    const file = new File([], 'background.png', { type: 'image/png' });
    Object.defineProperty(file, 'size', { value: MAX_BACKGROUND_IMAGE_BYTES + 1 });

    await expect(readBackgroundFileAsDataUrl(file)).rejects.toThrow(/64 MiB or smaller/i);
  });
});
