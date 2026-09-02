import type { SceneFrame } from '../domain/scene-frame';
import { createScenePreview } from './figure-preview';

const SVG_NAMESPACE = 'http://www.w3.org/2000/svg';
const XLINK_NAMESPACE = 'http://www.w3.org/1999/xlink';

export const VIDEO_WIDTH = 1920;
export const VIDEO_HEIGHT = 1080;

export function createVideoFrameSvg(
  frame: SceneFrame,
  width = VIDEO_WIDTH,
  height = VIDEO_HEIGHT,
): string {
  const svgDocument = document.implementation.createDocument(SVG_NAMESPACE, 'svg');
  const root = svgDocument.documentElement;
  setAttributes(root, {
    width,
    height,
    viewBox: `0 0 ${width} ${height}`,
  });

  appendElement(root, 'rect', {
    width,
    height,
    fill: frame.background.color,
  });

  if (frame.background.imageUrl) {
    const scale = frame.background.scale / 100;
    const imageGroup = appendElement(root, 'g', {
      transform: [
        `translate(${frame.background.positionX} ${frame.background.positionY})`,
        `translate(${width / 2} ${height / 2})`,
        `scale(${scale})`,
        `translate(${-width / 2} ${-height / 2})`,
      ].join(' '),
    });
    const image = appendElement(imageGroup, 'image', {
      width,
      height,
      preserveAspectRatio: backgroundAspectRatio(frame.background.fit),
    });
    image.setAttributeNS(XLINK_NAMESPACE, 'href', frame.background.imageUrl);
  }

  const camera = frame.camera;
  const scene = appendElement(root, 'svg', {
    x: 0,
    y: 0,
    width,
    height,
    viewBox: `${camera.positionX - camera.width / 2} ${camera.positionY - camera.height / 2} ${camera.width} ${camera.height}`,
    preserveAspectRatio: 'xMidYMid meet',
    overflow: 'hidden',
  });
  const sceneGroup = appendElement(scene, 'g', {
    transform:
      camera.rotation === 0
        ? null
        : `rotate(${-camera.rotation} ${camera.positionX} ${camera.positionY})`,
  });
  const preview = createScenePreview(frame.figures);

  for (const drawable of preview.drawables) {
    if (drawable.kind === 'line') {
      appendElement(sceneGroup, 'line', {
        x1: drawable.x1,
        y1: drawable.y1,
        x2: drawable.x2,
        y2: drawable.y2,
        stroke: drawable.color,
        'stroke-width': drawable.width,
        'stroke-linecap': drawable.lineCap,
      });
    } else if (drawable.kind === 'circle') {
      appendElement(sceneGroup, 'circle', {
        cx: drawable.cx,
        cy: drawable.cy,
        r: drawable.radius,
        fill: drawable.fill,
        stroke: drawable.stroke,
        'stroke-width': drawable.strokeWidth,
      });
    } else {
      appendElement(sceneGroup, 'path', {
        d: drawable.d,
        fill: drawable.fill,
        stroke: drawable.stroke,
        'stroke-width': drawable.strokeWidth,
        'stroke-linejoin': 'round',
      });
    }
  }

  return new XMLSerializer().serializeToString(svgDocument);
}

export async function renderVideoFramePng(frame: SceneFrame): Promise<Uint8Array> {
  const svg = createVideoFrameSvg(frame);
  const imageUrl = URL.createObjectURL(new Blob([svg], { type: 'image/svg+xml' }));

  try {
    const image = new Image();
    image.decoding = 'sync';
    image.src = imageUrl;
    await image.decode();

    const canvas = document.createElement('canvas');
    canvas.width = VIDEO_WIDTH;
    canvas.height = VIDEO_HEIGHT;
    const context = canvas.getContext('2d', { alpha: false });
    if (!context) {
      throw new Error('Video frame rendering is not available.');
    }
    context.drawImage(image, 0, 0, VIDEO_WIDTH, VIDEO_HEIGHT);

    const png = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/png'));
    if (!png) {
      throw new Error('Could not create a video frame.');
    }
    return new Uint8Array(await png.arrayBuffer());
  } finally {
    URL.revokeObjectURL(imageUrl);
  }
}

function backgroundAspectRatio(fit: SceneFrame['background']['fit']): string {
  switch (fit) {
    case 'cover':
      return 'xMidYMid slice';
    case 'contain':
      return 'xMidYMid meet';
    case 'fill':
      return 'none';
  }
}

function appendElement(
  parent: Element,
  name: string,
  attributes: Readonly<Record<string, string | number | null>>,
): Element {
  const element = parent.ownerDocument.createElementNS(SVG_NAMESPACE, name);
  setAttributes(element, attributes);
  parent.append(element);
  return element;
}

function setAttributes(
  element: Element,
  attributes: Readonly<Record<string, string | number | null>>,
): void {
  for (const [name, value] of Object.entries(attributes)) {
    if (value !== null) {
      element.setAttribute(name, String(value));
    }
  }
}
