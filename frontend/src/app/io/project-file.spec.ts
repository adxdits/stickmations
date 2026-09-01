import { createFigureLayer, createSceneFrame } from '../domain/scene-frame';
import { simpleFigure } from '../testing/app-test-harness';
import {
  createProjectFile,
  parseProjectFile,
  serializeProjectFile,
  type ProjectSnapshot,
} from './project-file';

describe('project file', () => {
  it('deduplicates repeated figure and background assets', () => {
    const imageUrl = `data:image/png;base64,${'A'.repeat(256_000)}`;
    const frame = {
      ...createSceneFrame(createFigureLayer('figure-1', simpleFigure)),
      background: {
        ...createSceneFrame().background,
        imageUrl,
        imageName: 'background.png',
      },
    };
    const snapshot = projectSnapshot(Array.from({ length: 100 }, () => frame));

    const project = createProjectFile(snapshot);
    const chunks = [...serializeProjectFile(snapshot, 1024)];
    const serialized = decodeChunks(chunks);

    expect(project.assets.figures).toEqual([simpleFigure]);
    expect(project.assets.images).toEqual([imageUrl]);
    expect(project.frames.every(({ figures }) => figures[0]?.figureAsset === 0)).toBe(true);
    expect(project.frames.every(({ background }) => background.imageAsset === 0)).toBe(true);
    expect(chunks.length).toBeGreaterThan(1);
    expect(chunks.every(({ byteLength }) => byteLength <= 1024)).toBe(true);
    expect(JSON.parse(serialized)).toEqual(project);
    expect(serialized.length).toBeLessThan(JSON.stringify(snapshot.frames).length / 20);
  });

  it('stores changed figure snapshots as separate assets', () => {
    const changedFigure = {
      ...simpleFigure,
      joints: simpleFigure.joints.map((joint) => ({ ...joint, x: joint.x + 10 })),
    };
    const project = createProjectFile(
      projectSnapshot([
        createSceneFrame(createFigureLayer('figure-1', simpleFigure)),
        createSceneFrame(createFigureLayer('figure-1', changedFigure)),
      ]),
    );

    expect(project.assets.figures).toHaveLength(2);
    expect(project.frames.map(({ figures }) => figures[0]?.figureAsset)).toEqual([0, 1]);
  });

  it('refuses to serialize a project above the configured size limit', () => {
    const snapshot = projectSnapshot([
      createSceneFrame(createFigureLayer('figure-1', simpleFigure)),
    ]);

    expect(() => [...serializeProjectFile(snapshot, 1024, 16)]).toThrow(/maximum supported size/i);
  });

  it('round-trips a complete saved project', () => {
    const richFigure = {
      ...simpleFigure,
      joints: simpleFigure.joints.map((joint, index) =>
        index === 0 ? { ...joint, isStatic: true, isStretchy: true } : joint,
      ),
      segments: simpleFigure.segments.map((segment, index) =>
        index === 0 ? { ...segment, shape: 'filled-circle' as const, hollow: false } : segment,
      ),
    };
    const snapshot = projectSnapshot([
      createSceneFrame(createFigureLayer('figure-1', richFigure)),
      createSceneFrame(createFigureLayer('figure-1', richFigure)),
    ]);

    const parsed = parseProjectFile(JSON.stringify(createProjectFile(snapshot)));

    expect(parsed).toEqual(snapshot);
  });

  it('rejects invalid asset references', () => {
    const project = createProjectFile(
      projectSnapshot([createSceneFrame(createFigureLayer('figure-1', simpleFigure))]),
    );
    const invalid = {
      ...project,
      frames: [
        {
          ...project.frames[0],
          figures: [{ ...project.frames[0]!.figures[0], figureAsset: 99 }],
        },
      ],
    };

    expect(() => parseProjectFile(JSON.stringify(invalid))).toThrow(/figure 1 asset/i);
  });

  it('rejects background assets that can load external or active content', () => {
    const project = createProjectFile(
      projectSnapshot([createSceneFrame(createFigureLayer('figure-1', simpleFigure))]),
    );
    const invalid = {
      ...project,
      assets: { ...project.assets, images: ['https://example.com/tracking.png'] },
    };

    expect(() => parseProjectFile(JSON.stringify(invalid))).toThrow(/embedded supported raster/i);

    invalid.assets.images = ['data:image/svg+xml;base64,PHN2Zz48L3N2Zz4='];
    expect(() => parseProjectFile(JSON.stringify(invalid))).toThrow(/embedded supported raster/i);
  });

  it('rejects figure paint values that reference external resources', () => {
    const project = createProjectFile(
      projectSnapshot([createSceneFrame(createFigureLayer('figure-1', simpleFigure))]),
    );
    const invalid = {
      ...project,
      assets: {
        ...project.assets,
        figures: [
          {
            ...project.assets.figures[0],
            segments: project.assets.figures[0]!.segments.map((segment, index) =>
              index === 0 ? { ...segment, color: 'url(https://example.com/paint.svg)' } : segment,
            ),
          },
        ],
      },
    };

    expect(() => parseProjectFile(JSON.stringify(invalid))).toThrow(/unsafe paint value/i);
  });
});

function projectSnapshot(frames: ProjectSnapshot['frames']): ProjectSnapshot {
  return {
    name: 'Example project',
    fps: 12,
    currentFrame: 1,
    selectedFigureId: 'figure-1',
    frames,
  };
}

function decodeChunks(chunks: readonly Uint8Array[]): string {
  const decoder = new TextDecoder();
  return chunks.map((chunk) => decoder.decode(chunk, { stream: true })).join('') + decoder.decode();
}
