import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { readFile } from 'node:fs/promises';
import { describe, it } from 'node:test';

const packageJson = JSON.parse(
  await readFile(new URL('../package.json', import.meta.url), 'utf8'),
);
const releaseWorkflow = await readFile(
  new URL('../.github/workflows/release.yml', import.meta.url),
  'utf8',
);
const license = await readFile(new URL('../LICENSE', import.meta.url), 'utf8');

describe('release configuration', () => {
  it('builds a valid macOS bundle without paid credentials', () => {
    assert.equal(packageJson.build.mac.identity, '-');
    assert.equal(packageJson.build.mac.hardenedRuntime, false);
  });

  it('publishes releases to the source repository with the built-in token', () => {
    assert.match(releaseWorkflow, /GH_REPO: \$\{\{ github\.repository \}\}/);
    assert.match(
      releaseWorkflow,
      /GH_TOKEN: \$\{\{ secrets\.GITHUB_TOKEN \}\}/,
    );
    assert.doesNotMatch(
      releaseWorkflow,
      /stickmations_opensource|RELEASE_GITHUB_TOKEN/,
    );
    assert.match(releaseWorkflow, /^permissions:\n  contents: read$/m);
    assert.match(
      releaseWorkflow,
      /  publish:[\s\S]*?    permissions:\n      contents: write/,
    );
    assert.match(releaseWorkflow, /release_tag:/);
  });

  it('creates new release tags at the commit that was built', () => {
    assert.match(releaseWorkflow, /RELEASE_COMMIT: \$\{\{ github\.sha \}\}/);
    assert.match(releaseWorkflow, /--target "\$RELEASE_COMMIT"/);
    assert.match(
      releaseWorkflow,
      /https:\/\/github\.com\/\$\{GH_REPO\}\/tree\/\$\{RELEASE_COMMIT\}/,
    );
  });

  it(
    'only reuses existing tags when their source matches the build',
    {
      skip: process.platform === 'win32',
    },
    () => {
      const sourceCheck = releaseWorkflow.match(
        /      - name: Verify release source\n[\s\S]*?        run: \|\n((?:          .*\n|\n)+)/,
      )?.[1];
      assert.ok(sourceCheck, 'The workflow must verify the release source.');
      const cases = [
        { refs: '', gitStatus: 0, expectedStatus: 0 },
        {
          refs: 'built-commit\trefs/tags/v1.2.3\n',
          gitStatus: 0,
          expectedStatus: 0,
        },
        {
          refs: 'tag-object\trefs/tags/v1.2.3\nbuilt-commit\trefs/tags/v1.2.3^{}\n',
          gitStatus: 0,
          expectedStatus: 0,
        },
        {
          refs: 'old-commit\trefs/tags/v1.2.3\n',
          gitStatus: 0,
          expectedStatus: 1,
        },
        {
          refs: 'tag-object\trefs/tags/v1.2.3\nold-commit\trefs/tags/v1.2.3^{}\n',
          gitStatus: 0,
          expectedStatus: 1,
        },
        { refs: '', gitStatus: 128, expectedStatus: 128 },
      ];
      for (const { refs, gitStatus, expectedStatus } of cases) {
        const result = spawnSync(
          'bash',
          [
            '-e',
            '-o',
            'pipefail',
            '-c',
            `git() { printf '%s' "$TEST_TAG_REFS"; return "$TEST_GIT_STATUS"; }\n${sourceCheck}`,
          ],
          {
            encoding: 'utf8',
            env: {
              ...process.env,
              RELEASE_TAG: 'v1.2.3',
              GITHUB_SHA: 'built-commit',
              TEST_TAG_REFS: refs,
              TEST_GIT_STATUS: String(gitStatus),
            },
          },
        );
        assert.equal(
          result.status,
          expectedStatus,
          result.stderr || result.stdout,
        );
        if (expectedStatus === 1) {
          assert.match(
            result.stdout,
            /::error::Release tag .*different commit/,
          );
        }
      }
    },
  );

  it('declares GPLv3 and includes its terms in packaged apps', () => {
    assert.equal(packageJson.license, 'GPL-3.0-only');
    assert.match(license, /GNU GENERAL PUBLIC LICENSE/);
    assert.match(license, /Version 3, 29 June 2007/);
    assert.match(license, /END OF TERMS AND CONDITIONS/);
    assert.doesNotMatch(license, /Business Source License/);
    assert.ok(
      packageJson.build.extraResources.some(
        ({ from, to }) => from === 'LICENSE' && to === 'LICENSE',
      ),
    );
  });

  it('only enforces package version checks for tag-triggered releases', () => {
    assert.match(
      releaseWorkflow,
      /name: Verify release version[\s\S]*if: startsWith\(github\.ref, 'refs\/tags\/'\)/,
    );
  });
});
