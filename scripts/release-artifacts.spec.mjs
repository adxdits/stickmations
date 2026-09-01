import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { expectedArtifactSuffixes } from './release-artifacts.mjs';

describe('release artifact names', () => {
  it('uses electron-builder Linux architecture aliases', () => {
    assert.deepEqual(expectedArtifactSuffixes('linux', 'x64'), [
      '-linux-x86_64.AppImage',
      '-linux-amd64.deb',
    ]);
  });

  it('uses the configured macOS and Windows names', () => {
    assert.deepEqual(expectedArtifactSuffixes('mac', 'arm64'), [
      '-mac-arm64.dmg',
      '-mac-arm64.zip',
    ]);
    assert.deepEqual(expectedArtifactSuffixes('mac', 'x64'), [
      '-mac-x64.dmg',
      '-mac-x64.zip',
    ]);
    assert.deepEqual(expectedArtifactSuffixes('win', 'x64'), [
      '-windows-x64-setup.exe',
      '-windows-x64-portable.exe',
    ]);
  });

  it('rejects unsupported release targets', () => {
    assert.throws(
      () => expectedArtifactSuffixes('linux', 'arm64'),
      /unsupported release target linux\/arm64/i,
    );
  });
});
