import { parseStickFigure, type StickFigure } from '@framation/engine';
import type { FrameTransform } from '../domain/animation-frame';
import type { SceneBackground, SceneCamera, SceneFrame } from '../domain/scene-frame';
import { requireSafeBackgroundImageDataUrl } from './background-image';

export const PROJECT_FILE_FORMAT = 'stickmations-project';
export const PROJECT_FILE_VERSION = 1;
export const PROJECT_FILE_EXTENSION = '.stickmation';
export const PROJECT_FILE_CHUNK_BYTES = 256 * 1024;
export const MAX_PROJECT_FILE_BYTES = 512 * 1024 * 1024;
const MAX_PAINT_CHARACTERS = 128;

export interface ProjectSnapshot {
  readonly name: string;
  readonly fps: number;
  readonly currentFrame: number;
  readonly selectedFigureId: string | null;
  readonly frames: readonly SceneFrame[];
}

interface ProjectFigureLayer {
  readonly id: string;
  readonly visible: boolean;
  readonly figureAsset: number;
  readonly transform: FrameTransform;
}

interface ProjectBackground extends Omit<SceneBackground, 'imageUrl'> {
  readonly imageAsset: number | null;
}

interface ProjectFrame {
  readonly figures: readonly ProjectFigureLayer[];
  readonly background: ProjectBackground;
  readonly camera: SceneCamera;
}

interface ProjectAssets {
  readonly figures: StickFigure[];
  readonly figureIndices: Map<number, number[]>;
  readonly images: string[];
  readonly imageIndices: Map<string, number>;
}

export interface ProjectFile {
  readonly format: typeof PROJECT_FILE_FORMAT;
  readonly version: typeof PROJECT_FILE_VERSION;
  readonly name: string;
  readonly document: Readonly<{
    fps: number;
    currentFrame: number;
    selectedFigureId: string | null;
  }>;
  readonly assets: Readonly<{
    figures: readonly StickFigure[];
    images: readonly string[];
  }>;
  readonly frames: readonly ProjectFrame[];
}

export function createProjectFile(snapshot: ProjectSnapshot): ProjectFile {
  const assets = collectProjectAssets(snapshot.frames);

  return {
    format: PROJECT_FILE_FORMAT,
    version: PROJECT_FILE_VERSION,
    name: snapshot.name,
    document: {
      fps: snapshot.fps,
      currentFrame: snapshot.currentFrame,
      selectedFigureId: snapshot.selectedFigureId,
    },
    assets: { figures: assets.figures, images: assets.images },
    frames: snapshot.frames.map((frame) => projectFrame(frame, assets)),
  };
}

export function parseProjectFile(source: string): ProjectSnapshot {
  let value: unknown;
  try {
    value = JSON.parse(source) as unknown;
  } catch {
    throw new Error('The selected file is not a valid Stickmations project.');
  }

  const project = requireRecord(value, 'The project must be a JSON object.');
  if (project['format'] !== PROJECT_FILE_FORMAT) {
    throw new Error('The selected file is not a Stickmations project.');
  }
  if (project['version'] !== PROJECT_FILE_VERSION) {
    throw new Error(`Project format version ${String(project['version'])} is not supported.`);
  }

  const assets = requireRecord(project['assets'], 'Project assets are missing.');
  const figures = requireArray(assets['figures'], 'Project figure assets').map(parseProjectFigure);
  const images = requireArray(assets['images'], 'Project image assets').map((image, index) =>
    requireSafeBackgroundImageDataUrl(image, `Image asset ${index + 1}`),
  );
  const frameValues = requireArray(project['frames'], 'Project frames');
  if (frameValues.length === 0) {
    throw new Error('A project must contain at least one frame.');
  }
  const frames = frameValues.map((frame, index) =>
    parseProjectFrame(frame, index, figures, images),
  );

  const document = requireRecord(project['document'], 'Project document settings are missing.');
  const fps = requireInteger(document['fps'], 'Project frame rate', 1, 60);
  const currentFrame = requireInteger(document['currentFrame'], 'Current frame', 1, frames.length);
  const selectedFigureId = requireNullableString(
    document['selectedFigureId'],
    'Selected figure id',
  );
  if (
    selectedFigureId !== null &&
    !frames[currentFrame - 1]?.figures.some(({ id }) => id === selectedFigureId)
  ) {
    throw new Error('The selected figure does not exist in the current frame.');
  }

  return {
    name: requireString(project['name'], 'Project name'),
    fps,
    currentFrame,
    selectedFigureId,
    frames,
  };
}

function parseProjectFrame(
  value: unknown,
  frameIndex: number,
  figures: readonly StickFigure[],
  images: readonly string[],
): SceneFrame {
  const frame = requireRecord(value, `Frame ${frameIndex + 1} must be an object.`);
  const ids = new Set<string>();
  const layers = requireArray(frame['figures'], `Frame ${frameIndex + 1} figures`).map(
    (layerValue, layerIndex) => {
      const label = `Frame ${frameIndex + 1} figure ${layerIndex + 1}`;
      const layer = requireRecord(layerValue, `${label} must be an object.`);
      const id = requireString(layer['id'], `${label} id`);
      if (ids.has(id)) {
        throw new Error(`${label} duplicates figure id "${id}".`);
      }
      ids.add(id);
      const figureAsset = requireAssetIndex(layer['figureAsset'], `${label} asset`, figures.length);
      const transform = requireRecord(layer['transform'], `${label} transform is missing.`);
      return {
        id,
        visible: requireBoolean(layer['visible'], `${label} visibility`),
        figure: figures[figureAsset]!,
        transform: {
          positionX: requireFiniteNumber(transform['positionX'], `${label} position X`),
          positionY: requireFiniteNumber(transform['positionY'], `${label} position Y`),
          rotation: requireFiniteNumber(transform['rotation'], `${label} rotation`),
          scaleX: requirePositiveNumber(transform['scaleX'], `${label} scale X`),
          scaleY: requirePositiveNumber(transform['scaleY'], `${label} scale Y`),
          flipX: requireBoolean(transform['flipX'], `${label} horizontal flip`),
          flipY: requireBoolean(transform['flipY'], `${label} vertical flip`),
        },
      };
    },
  );

  const background = requireRecord(
    frame['background'],
    `Frame ${frameIndex + 1} background is missing.`,
  );
  const imageAsset = background['imageAsset'];
  const fit = background['fit'];
  if (fit !== 'cover' && fit !== 'contain' && fit !== 'fill') {
    throw new Error(`Frame ${frameIndex + 1} background fit is invalid.`);
  }

  const camera = requireRecord(frame['camera'], `Frame ${frameIndex + 1} camera is missing.`);
  return {
    figures: layers,
    background: {
      color: requireSafePaint(background['color'], `Frame ${frameIndex + 1} background color`),
      imageUrl:
        imageAsset === null
          ? null
          : images[
              requireAssetIndex(
                imageAsset,
                `Frame ${frameIndex + 1} background image`,
                images.length,
              )
            ]!,
      imageName: requireNullableString(
        background['imageName'],
        `Frame ${frameIndex + 1} background image name`,
      ),
      fit,
      scale: requirePositiveNumber(background['scale'], `Frame ${frameIndex + 1} background scale`),
      positionX: requireFiniteNumber(
        background['positionX'],
        `Frame ${frameIndex + 1} background position X`,
      ),
      positionY: requireFiniteNumber(
        background['positionY'],
        `Frame ${frameIndex + 1} background position Y`,
      ),
    },
    camera: {
      positionX: requireFiniteNumber(
        camera['positionX'],
        `Frame ${frameIndex + 1} camera position X`,
      ),
      positionY: requireFiniteNumber(
        camera['positionY'],
        `Frame ${frameIndex + 1} camera position Y`,
      ),
      width: requirePositiveNumber(camera['width'], `Frame ${frameIndex + 1} camera width`),
      height: requirePositiveNumber(camera['height'], `Frame ${frameIndex + 1} camera height`),
      rotation: requireFiniteNumber(camera['rotation'], `Frame ${frameIndex + 1} camera rotation`),
    },
  };
}

function parseProjectFigure(value: unknown, index: number): StickFigure {
  let figure: StickFigure;
  try {
    figure = parseStickFigure(value);
  } catch (error: unknown) {
    const reason = error instanceof Error ? error.message : 'unknown figure data';
    throw new Error(`Figure asset ${index + 1} is invalid: ${reason}`);
  }

  for (const joint of figure.joints) {
    requireSafePaint(joint.color, `Figure asset ${index + 1} joint "${joint.id}" color`);
  }
  for (const segment of figure.segments) {
    requireSafePaint(segment.color, `Figure asset ${index + 1} segment "${segment.id}" color`);
  }
  return figure;
}

function requireSafePaint(value: unknown, property: string): string {
  const paint = requireString(value, property);
  if (
    paint.length > MAX_PAINT_CHARACTERS ||
    /[\u0000-\u001f\u007f]/.test(paint) ||
    /url\s*\(/i.test(paint)
  ) {
    throw new Error(`${property} contains an unsafe paint value.`);
  }
  return paint;
}

function requireRecord(value: unknown, message: string): Record<string, unknown> {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    throw new Error(message);
  }
  return value as Record<string, unknown>;
}

function requireArray(value: unknown, property: string): readonly unknown[] {
  if (!Array.isArray(value)) {
    throw new Error(`${property} must be an array.`);
  }
  return value;
}

function requireString(value: unknown, property: string): string {
  if (typeof value !== 'string' || value.trim().length === 0) {
    throw new Error(`${property} must be a non-empty string.`);
  }
  return value;
}

function requireNullableString(value: unknown, property: string): string | null {
  return value === null ? null : requireString(value, property);
}

function requireBoolean(value: unknown, property: string): boolean {
  if (typeof value !== 'boolean') {
    throw new Error(`${property} must be true or false.`);
  }
  return value;
}

function requireFiniteNumber(value: unknown, property: string): number {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    throw new Error(`${property} must be a finite number.`);
  }
  return value;
}

function requirePositiveNumber(value: unknown, property: string): number {
  const number = requireFiniteNumber(value, property);
  if (number <= 0) {
    throw new Error(`${property} must be greater than zero.`);
  }
  return number;
}

function requireInteger(
  value: unknown,
  property: string,
  minimum: number,
  maximum: number,
): number {
  if (!Number.isInteger(value) || (value as number) < minimum || (value as number) > maximum) {
    throw new Error(`${property} must be an integer from ${minimum} to ${maximum}.`);
  }
  return value as number;
}

function requireAssetIndex(value: unknown, property: string, assetCount: number): number {
  return requireInteger(value, property, 0, assetCount - 1);
}

export function* serializeProjectFile(
  snapshot: ProjectSnapshot,
  maximumChunkBytes = PROJECT_FILE_CHUNK_BYTES,
  maximumFileBytes = MAX_PROJECT_FILE_BYTES,
): Generator<Uint8Array<ArrayBuffer>> {
  if (!Number.isInteger(maximumChunkBytes) || maximumChunkBytes < 1) {
    throw new Error('Project file chunks must contain at least one byte.');
  }
  if (!Number.isInteger(maximumFileBytes) || maximumFileBytes < 1) {
    throw new Error('The project file size limit must be at least one byte.');
  }

  const assets = collectProjectAssets(snapshot.frames);
  const encoder = new TextEncoder();
  let chunk = new Uint8Array(maximumChunkBytes);
  let chunkLength = 0;
  let totalBytes = 0;

  for (const part of projectJsonParts(snapshot, assets)) {
    const bytes = encoder.encode(part);
    let offset = 0;
    while (offset < bytes.byteLength) {
      const writeLength = Math.min(maximumChunkBytes - chunkLength, bytes.byteLength - offset);
      if (totalBytes + writeLength > maximumFileBytes) {
        throw new Error('The project exceeds the maximum supported size.');
      }
      chunk.set(bytes.subarray(offset, offset + writeLength), chunkLength);
      chunkLength += writeLength;
      totalBytes += writeLength;
      offset += writeLength;
      if (chunkLength === maximumChunkBytes) {
        yield chunk;
        chunk = new Uint8Array(maximumChunkBytes);
        chunkLength = 0;
      }
    }
  }

  if (chunkLength > 0) {
    yield chunk.slice(0, chunkLength);
  }
}

function collectProjectAssets(frames: readonly SceneFrame[]): ProjectAssets {
  const assets: ProjectAssets = {
    figures: [],
    figureIndices: new Map(),
    images: [],
    imageIndices: new Map(),
  };

  for (const frame of frames) {
    for (const { figure } of frame.figures) {
      figureAssetIndex(figure, assets);
    }
    if (frame.background.imageUrl !== null) {
      imageAssetIndex(frame.background.imageUrl, assets);
    }
  }
  return assets;
}

function projectFrame(frame: SceneFrame, assets: ProjectAssets): ProjectFrame {
  return {
    figures: frame.figures.map(({ id, visible, figure, transform }) => ({
      id,
      visible,
      figureAsset: figureAssetIndex(figure, assets),
      transform,
    })),
    background: {
      color: frame.background.color,
      imageName: frame.background.imageName,
      imageAsset:
        frame.background.imageUrl === null
          ? null
          : imageAssetIndex(frame.background.imageUrl, assets),
      fit: frame.background.fit,
      scale: frame.background.scale,
      positionX: frame.background.positionX,
      positionY: frame.background.positionY,
    },
    camera: frame.camera,
  };
}

function figureAssetIndex(figure: StickFigure, assets: ProjectAssets): number {
  const serialized = JSON.stringify(figure);
  const hash = hashString(serialized);
  const candidates = assets.figureIndices.get(hash) ?? [];
  for (const index of candidates) {
    if (JSON.stringify(assets.figures[index]) === serialized) {
      return index;
    }
  }

  const index = assets.figures.length;
  assets.figures.push(figure);
  candidates.push(index);
  assets.figureIndices.set(hash, candidates);
  return index;
}

function imageAssetIndex(image: string, assets: ProjectAssets): number {
  const existing = assets.imageIndices.get(image);
  if (existing !== undefined) {
    return existing;
  }

  const index = assets.images.length;
  assets.images.push(image);
  assets.imageIndices.set(image, index);
  return index;
}

function hashString(value: string): number {
  let hash = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function* projectJsonParts(snapshot: ProjectSnapshot, assets: ProjectAssets): Generator<string> {
  yield `{"format":${JSON.stringify(PROJECT_FILE_FORMAT)},"version":${PROJECT_FILE_VERSION},"name":`;
  yield* jsonStringParts(snapshot.name);
  yield `,"document":${JSON.stringify({
    fps: snapshot.fps,
    currentFrame: snapshot.currentFrame,
    selectedFigureId: snapshot.selectedFigureId,
  })},"assets":{"figures":[`;
  yield* jsonArrayParts(assets.figures, (figure) => [JSON.stringify(figure)]);
  yield '],"images":[';
  yield* jsonArrayParts(assets.images, jsonStringParts);
  yield ']},"frames":[';
  yield* jsonArrayParts(snapshot.frames, (frame) => [JSON.stringify(projectFrame(frame, assets))]);
  yield ']}';
}

function* jsonArrayParts<T>(
  values: readonly T[],
  partsForValue: (value: T) => Iterable<string>,
): Generator<string> {
  for (const [index, value] of values.entries()) {
    if (index > 0) {
      yield ',';
    }
    yield* partsForValue(value);
  }
}

function* jsonStringParts(value: string): Generator<string> {
  const maximumPartCharacters = 32 * 1024;
  yield '"';
  for (let offset = 0; offset < value.length; offset += maximumPartCharacters) {
    yield JSON.stringify(value.slice(offset, offset + maximumPartCharacters)).slice(1, -1);
  }
  yield '"';
}
