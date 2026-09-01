import { requireSafeBackgroundImageDataUrl } from './background-image';

describe('requireSafeBackgroundImageDataUrl', () => {
  it.each(['AAAA', 'AAA=', 'AA=='])('accepts valid base64 padding in %s', (payload) => {
    const source = `data:image/png;base64,${payload}`;

    expect(requireSafeBackgroundImageDataUrl(source)).toBe(source);
  });

  it.each(['', 'A', 'A===', 'AA=A', 'AA A'])('rejects malformed base64 payload %j', (payload) => {
    expect(() => requireSafeBackgroundImageDataUrl(`data:image/png;base64,${payload}`)).toThrow(
      /embedded supported raster image/i,
    );
  });

  it.each([
    'https://example.com/background.png',
    'data:image/svg+xml;base64,PHN2Zz48L3N2Zz4=',
    'data:text/html;base64,PGgxPk5vdCBhbiBpbWFnZTwvaDE+',
  ])('rejects unsafe source %s', (source) => {
    expect(() => requireSafeBackgroundImageDataUrl(source)).toThrow(
      /embedded supported raster image/i,
    );
  });
});
