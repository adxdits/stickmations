import { spawnSync } from 'node:child_process';
import { readdir, stat } from 'node:fs/promises';
import { basename, join } from 'node:path';
import { expectedArtifactSuffixes } from './release-artifacts.mjs';

const [platform, architecture] = process.argv.slice(2);
const expectedSuffixes = expectedArtifactSuffixes(platform, architecture);

const releaseDirectory = join(process.cwd(), 'release');
const files = await listFiles(releaseDirectory);
const releaseFiles = files.map((file) => basename(file));

for (const suffix of expectedSuffixes) {
  const artifact = releaseFiles.find((file) => file.endsWith(suffix));
  if (!artifact) {
    throw new Error(
      `Missing ${platform}/${architecture} release artifact ending in ${suffix}.`,
    );
  }
}

const ffmpegName = platform === 'win' ? 'ffmpeg.exe' : 'ffmpeg';
const ffmpegPath = files.find(
  (file) =>
    basename(file) === ffmpegName &&
    file
      .toLowerCase()
      .includes(join('resources', 'ffmpeg-static').toLowerCase()),
);
if (!ffmpegPath || (await stat(ffmpegPath)).size < 1_000_000) {
  throw new Error(
    `The ${platform}/${architecture} package does not contain FFmpeg.`,
  );
}

const probe = spawnSync(ffmpegPath, ['-version'], {
  encoding: 'utf8',
  timeout: 15_000,
});
if (probe.status !== 0 || !probe.stdout.startsWith('ffmpeg version')) {
  throw new Error(
    `Bundled FFmpeg cannot run on ${platform}/${architecture}: ${probe.stderr || probe.error}`,
  );
}

console.log(
  `Verified ${platform}/${architecture} installers and bundled FFmpeg.`,
);

async function listFiles(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const nested = await Promise.all(
    entries.map((entry) => {
      const path = join(directory, entry.name);
      return entry.isDirectory() ? listFiles(path) : [path];
    }),
  );
  return nested.flat();
}
