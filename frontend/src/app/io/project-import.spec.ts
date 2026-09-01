import { createFigureLayer, createSceneFrame } from '../domain/scene-frame';
import { simpleFigure } from '../testing/app-test-harness';
import { createProjectFile, type ProjectSnapshot } from './project-file';
import { readProjectFile } from './project-import';

describe('readProjectFile', () => {
  it('reads a gzip-compressed saved project', async () => {
    const snapshot = projectSnapshot();
    const file = await compressedProjectFile(snapshot);

    await expect(readProjectFile(file)).resolves.toEqual(snapshot);
  });

  it('accepts an uncompressed project for compatibility', async () => {
    const snapshot = projectSnapshot();
    const file = new File([JSON.stringify(createProjectFile(snapshot))], 'Example.stickmation');

    await expect(readProjectFile(file)).resolves.toEqual(snapshot);
  });

  it('rejects decompressed data above the configured limit', async () => {
    const file = await compressedProjectFile({
      ...projectSnapshot(),
      name: 'A'.repeat(4096),
    });

    expect(file.size).toBeLessThan(1024);

    await expect(readProjectFile(file, { maximumBytes: 1024 })).rejects.toThrow(
      /maximum supported size/i,
    );
  });

  it('stops before reading a project when the operation is cancelled', async () => {
    const file = new File(
      [JSON.stringify(createProjectFile(projectSnapshot()))],
      'Example.stickmation',
    );
    const operation = new AbortController();
    operation.abort();

    await expect(
      readProjectFile(file, { maximumBytes: MAX_SAFE_TEST_BYTES, signal: operation.signal }),
    ).rejects.toMatchObject({ name: 'AbortError' });
  });
});

const MAX_SAFE_TEST_BYTES = 1024 * 1024;

async function compressedProjectFile(snapshot: ProjectSnapshot): Promise<File> {
  const source = JSON.stringify(createProjectFile(snapshot));
  const input = new ReadableStream<BufferSource>({
    start(controller) {
      controller.enqueue(new TextEncoder().encode(source));
      controller.close();
    },
  });
  const compressed = input.pipeThrough(new CompressionStream('gzip'));
  const bytes = new Uint8Array(await new Response(compressed).arrayBuffer());
  return new File([bytes], 'Example.stickmation', {
    type: 'application/gzip',
  });
}

function projectSnapshot(): ProjectSnapshot {
  return {
    name: 'Example project',
    fps: 24,
    currentFrame: 1,
    selectedFigureId: 'figure-1',
    frames: [createSceneFrame(createFigureLayer('figure-1', simpleFigure))],
  };
}
