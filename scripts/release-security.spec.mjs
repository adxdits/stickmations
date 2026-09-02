import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { describe, it } from 'node:test';

const packageJson = JSON.parse(
  await readFile(new URL('../package.json', import.meta.url), 'utf8'),
);
const releaseWorkflow = await readFile(
  new URL('../.github/workflows/release.yml', import.meta.url),
  'utf8',
);

describe('release security', () => {
  it('requires signed and notarized desktop artifacts', () => {
    assert.equal(packageJson.build.forceCodeSigning, true);
    assert.equal(packageJson.build.mac.hardenedRuntime, true);
    assert.equal(packageJson.build.mac.notarize, true);
    assert.deepEqual(
      packageJson.build.win.signtoolOptions.signingHashAlgorithms,
      ['sha256'],
    );

    for (const secret of [
      'MACOS_CSC_LINK',
      'MACOS_CSC_KEY_PASSWORD',
      'APPLE_API_KEY_BASE64',
      'APPLE_API_KEY_ID',
      'APPLE_API_ISSUER',
      'WINDOWS_CSC_LINK',
      'WINDOWS_CSC_KEY_PASSWORD',
      'RELEASE_GITHUB_TOKEN',
    ]) {
      assert.match(releaseWorkflow, new RegExp(`secrets\\.${secret}`));
    }
  });

  it('publishes releases only to the public repository', () => {
    assert.match(
      releaseWorkflow,
      /GH_REPO: adxdits\/stickmations_opensource/,
    );
    assert.doesNotMatch(releaseWorkflow, /GH_REPO:.*github\.repository/);
    assert.match(releaseWorkflow, /GH_TOKEN:.*RELEASE_GITHUB_TOKEN/);
    assert.match(releaseWorkflow, /release_tag:/);
  });
});