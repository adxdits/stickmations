import { spawnSync } from 'node:child_process';
import { readdir, stat } from 'node:fs/promises';
import { basename, dirname, join } from 'node:path';
import { expectedArtifactSuffixes } from './release-artifacts.mjs';

const [platform, architecture] = process.argv.slice(2);
const expectedSuffixes = expectedArtifactSuffixes(platform, architecture);

const releaseDirectory = join(process.cwd(), 'release');
const files = await listFiles(releaseDirectory);
const releaseFiles = files.map((file) => basename(file));
const artifacts = [];

for (const suffix of expectedSuffixes) {
  const artifactIndex = releaseFiles.findIndex((file) => file.endsWith(suffix));
  const artifact = releaseFiles[artifactIndex];
  if (!artifact) {
    throw new Error(
      `Missing ${platform}/${architecture} release artifact ending in ${suffix}.`,
    );
  }
  artifacts.push(files[artifactIndex]);
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

if (platform === 'mac') {
  verifyMacRelease(files);
} else if (platform === 'win') {
  verifyWindowsRelease(artifacts);
}

console.log(
  `Verified ${platform}/${architecture} installers, trust, and bundled FFmpeg.`,
);

function verifyMacRelease(releaseContents) {
  const appExecutable = releaseContents.find((file) =>
    file.endsWith(join('Stickmations.app', 'Contents', 'MacOS', 'Stickmations')),
  );
  if (!appExecutable) {
    throw new Error('The macOS release does not contain Stickmations.app.');
  }

  const appPath = dirname(dirname(dirname(appExecutable)));
  runVerification(
    'codesign',
    ['--verify', '--deep', '--strict', '--verbose=2', appPath],
    'macOS code signature verification',
  );
  runVerification(
    'xcrun',
    ['stapler', 'validate', appPath],
    'macOS notarization ticket verification',
  );
  runVerification(
    'spctl',
    ['--assess', '--type', 'execute', '--verbose=4', appPath],
    'macOS Gatekeeper assessment',
  );
}

function verifyWindowsRelease(releaseArtifacts) {
  const signatureCheck = [
    '$signature = Get-AuthenticodeSignature -LiteralPath $env:STICKMATIONS_SIGNATURE_PATH',
    "if ($signature.Status -ne 'Valid') { Write-Error ('Invalid Authenticode signature: ' + $signature.Status); exit 1 }",
    '$signature.SignerCertificate.Subject',
  ].join('; ');

  for (const artifact of releaseArtifacts) {
    runVerification(
      'powershell.exe',
      ['-NoLogo', '-NoProfile', '-NonInteractive', '-Command', signatureCheck],
      `Authenticode verification for ${basename(artifact)}`,
      { STICKMATIONS_SIGNATURE_PATH: artifact },
    );
  }
}

function runVerification(command, args, description, extraEnvironment = {}) {
  const result = spawnSync(command, args, {
    encoding: 'utf8',
    env: { ...process.env, ...extraEnvironment },
    timeout: 30_000,
  });
  if (result.status !== 0) {
    throw new Error(
      `${description} failed: ${result.stderr || result.stdout || result.error}`,
    );
  }
}

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
