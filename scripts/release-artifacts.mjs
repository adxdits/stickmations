const ARTIFACT_SUFFIXES = {
  mac: {
    arm64: ['-mac-arm64.dmg', '-mac-arm64.zip'],
    x64: ['-mac-x64.dmg', '-mac-x64.zip'],
  },
  win: {
    x64: ['-windows-x64-setup.exe', '-windows-x64-portable.exe'],
  },
  linux: {
    x64: ['-linux-x86_64.AppImage', '-linux-amd64.deb'],
  },
};

export function expectedArtifactSuffixes(platform, architecture) {
  const suffixes = ARTIFACT_SUFFIXES[platform]?.[architecture];
  if (!suffixes) {
    throw new Error(
      `Unsupported release target ${platform || '<platform>'}/${architecture || '<architecture>'}.`,
    );
  }
  return suffixes;
}
