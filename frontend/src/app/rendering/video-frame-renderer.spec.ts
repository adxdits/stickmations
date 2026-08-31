import { createFigureLayer, createSceneFrame } from '../domain/scene-frame';
import { simpleFigure } from '../testing/app-test-harness';
import { createVideoFrameSvg, VIDEO_HEIGHT, VIDEO_WIDTH } from './video-frame-renderer';

describe('video frame renderer', () => {
  it('renders a camera-framed Full HD scene with its background and visible figures', () => {
    const frame = createSceneFrame(createFigureLayer('visible', simpleFigure));
    const hidden = { ...createFigureLayer('hidden', simpleFigure), visible: false };
    const source = createVideoFrameSvg({
      ...frame,
      figures: [...frame.figures, hidden],
      background: {
        ...frame.background,
        color: '#123456',
        imageUrl: 'data:image/png;base64,AAAA',
        fit: 'cover',
        scale: 125,
        positionX: 8,
        positionY: -4,
      },
      camera: {
        positionX: 10,
        positionY: 20,
        width: 640,
        height: 360,
        rotation: 15,
      },
    });
    const document = new DOMParser().parseFromString(source, 'image/svg+xml');
    const root = document.documentElement;
    const image = root.querySelector('image');
    const scene = root.querySelector('svg');

    expect(root.getAttribute('width')).toBe(String(VIDEO_WIDTH));
    expect(root.getAttribute('height')).toBe(String(VIDEO_HEIGHT));
    expect(root.querySelector('rect')?.getAttribute('fill')).toBe('#123456');
    expect(image?.getAttribute('preserveAspectRatio')).toBe('xMidYMid slice');
    expect(image?.parentElement?.getAttribute('transform')).toContain('scale(1.25)');
    expect(scene?.getAttribute('viewBox')).toBe('-310 -160 640 360');
    expect(scene?.querySelector('g')?.getAttribute('transform')).toBe('rotate(-15 10 20)');
    expect(scene?.querySelectorAll('line')).toHaveLength(1);
  });

  it.each([
    ['contain', 'xMidYMid meet'],
    ['fill', 'none'],
  ] as const)('maps %s background fitting to SVG', (fit, expected) => {
    const frame = createSceneFrame();
    const source = createVideoFrameSvg({
      ...frame,
      background: { ...frame.background, imageUrl: 'data:image/png;base64,AAAA', fit },
    });
    const document = new DOMParser().parseFromString(source, 'image/svg+xml');

    expect(document.querySelector('image')?.getAttribute('preserveAspectRatio')).toBe(expected);
  });
});
