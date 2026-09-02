export interface ReleaseAsset {
  readonly label: string;
  readonly format: string;
  readonly url: string;
  readonly recommended?: boolean;
}

export interface PlatformRelease {
  readonly name: string;
  readonly requirement: string;
  readonly assets: readonly ReleaseAsset[];
}

export interface DesktopRelease {
  readonly version: string;
  readonly releaseNotesUrl: string;
  readonly platforms: readonly PlatformRelease[];
}

export interface SiteFeature {
  readonly title: string;
  readonly description: string;
}

export interface FigureResource {
  readonly name: string;
  readonly description: string;
  readonly url: string;
}

export interface SiteNews {
  readonly title: string;
  readonly description: string;
  readonly publishedAt: string;
  readonly publishedLabel: string;
}

export interface CreatorProfile {
  readonly name: string;
  readonly description: string;
  readonly discordUrl: string;
  readonly redditUrl: string;
  readonly supportUrl: string;
  readonly linkedinUrl: string;
  readonly githubUrl: string;
  readonly email: string;
}

export interface DownloadSiteConfig {
  readonly productName: string;
  readonly news: SiteNews;
  readonly release: DesktopRelease;
  readonly proStatus: string;
  readonly features: readonly SiteFeature[];
  readonly figureResources: readonly FigureResource[];
  readonly creator: CreatorProfile;
  readonly copyright: string;
}

const RELEASE_VERSION = '0.1.1';
const RELEASE_REPOSITORY =
  'https://github.com/adxdits/stickmations_opensource';
const RELEASE_URL = `${RELEASE_REPOSITORY}/releases/tag/v${RELEASE_VERSION}`;
const RELEASE_DOWNLOAD_URL = `${RELEASE_REPOSITORY}/releases/download/v${RELEASE_VERSION}`;

export const DOWNLOAD_SITE_CONFIG: DownloadSiteConfig = {
  productName: 'Stickmations',
  news: {
    title: 'Project save and import are now available',
    description:
      'Keep your animation in a compact project file and reopen it whenever you need.',
    publishedAt: '2026-09-01',
    publishedLabel: 'September 2026',
  },
  release: {
    version: RELEASE_VERSION,
    releaseNotesUrl: RELEASE_URL,
    platforms: [
      {
        name: 'Windows',
        requirement: 'Windows 10 or 11 · x64',
        assets: [
          {
            label: 'Install',
            format: 'EXE',
            url: `${RELEASE_DOWNLOAD_URL}/Stickmations-${RELEASE_VERSION}-windows-x64-setup.exe`,
            recommended: true,
          },
          {
            label: 'Portable',
            format: 'EXE',
            url: `${RELEASE_DOWNLOAD_URL}/Stickmations-${RELEASE_VERSION}-windows-x64-portable.exe`,
          },
        ],
      },
      {
        name: 'macOS',
        requirement: 'Apple Silicon or Intel',
        assets: [
          {
            label: 'Apple Silicon',
            format: 'DMG',
            url: `${RELEASE_DOWNLOAD_URL}/Stickmations-${RELEASE_VERSION}-mac-arm64.dmg`,
            recommended: true,
          },
          {
            label: 'Apple Silicon',
            format: 'ZIP',
            url: `${RELEASE_DOWNLOAD_URL}/Stickmations-${RELEASE_VERSION}-mac-arm64.zip`,
          },
          {
            label: 'Intel',
            format: 'DMG',
            url: `${RELEASE_DOWNLOAD_URL}/Stickmations-${RELEASE_VERSION}-mac-x64.dmg`,
            recommended: true,
          },
          {
            label: 'Intel',
            format: 'ZIP',
            url: `${RELEASE_DOWNLOAD_URL}/Stickmations-${RELEASE_VERSION}-mac-x64.zip`,
          },
        ],
      },
      {
        name: 'Linux',
        requirement: 'x64',
        assets: [
          {
            label: 'AppImage',
            format: 'Universal',
            url: `${RELEASE_DOWNLOAD_URL}/Stickmations-${RELEASE_VERSION}-linux-x86_64.AppImage`,
            recommended: true,
          },
          {
            label: 'Debian / Ubuntu',
            format: 'DEB',
            url: `${RELEASE_DOWNLOAD_URL}/Stickmations-${RELEASE_VERSION}-linux-amd64.deb`,
          },
        ],
      },
    ],
  },
  proStatus: 'Release soon',
  features: [
    {
      title: 'Frame-by-frame editing',
      description: 'Pose figures and shape movement on a direct timeline.',
    },
    {
      title: 'Scene and camera tools',
      description: 'Layer figures, add backgrounds, and frame each shot.',
    },
    {
      title: 'Full HD export',
      description: 'Render finished animation to a high-quality 1080p MP4.',
    },
    {
      title: 'Stick Nodes import',
      description: 'Import compatible .nodes stick-figure files.',
    },
  ],
  figureResources: [
    {
      name: 'Stick Nodes',
      description: 'Official .nodes figure library',
      url: 'https://sticknodes.com/stickfigures/',
    },
    {
      name: 'Pivot Animator',
      description: 'Official STK figure library',
      url: 'https://pivotanimator.net/stk-library',
    },
  ],
  creator: {
    name: 'Adam Almounayar',
    description: 'Developer, animator, and a big fan of Stick Nodes.',
    discordUrl: 'https://discord.gg/5YQTaaC5W',
    redditUrl: 'https://www.reddit.com/r/StickmationsOfficial/',
    supportUrl: 'https://buymeacoffee.com/adxdits',
    linkedinUrl: 'https://www.linkedin.com/in/adam-al-mounayar-0b6a5026b/',
    githubUrl: 'https://github.com/adxdits',
    email: 'adamalmounayar@hotmail.com',
  },
  copyright: '© 2026 Stickmations',
};
