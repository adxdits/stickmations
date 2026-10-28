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

describe('release configuration', () => {
  it('builds a valid macOS bundle without paid credentials', () => {
    assert.equal(packageJson.build.mac.identity, '-');
    assert.equal(packageJson.build.mac.hardenedRuntime, false);
  });

  it('publishes releases only to the public repository', () => {
    assert.match(releaseWorkflow, /GH_REPO: adxdits\/stickmations_opensource/);
    assert.doesNotMatch(releaseWorkflow, /GH_REPO:.*github\.repository/);
    assert.match(releaseWorkflow, /GH_TOKEN:.*RELEASE_GITHUB_TOKEN/);
    assert.match(releaseWorkflow, /release_tag:/);
  });

  it('only enforces package version checks for tag-triggered releases', () => {
    assert.match(
      releaseWorkflow,
      /name: Verify release version[\s\S]*if: startsWith\(github\.ref, 'refs\/tags\/'\)/,
    );
  });
});