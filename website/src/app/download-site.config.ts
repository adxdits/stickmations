export interface DownloadEdition {
  readonly name: string;
  readonly status?: string;
  readonly actionLabel: string;
  readonly url: string | null;
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
  readonly editions: readonly DownloadEdition[];
  readonly features: readonly SiteFeature[];
  readonly figureResources: readonly FigureResource[];
  readonly creator: CreatorProfile;
  readonly copyright: string;
}

export const DOWNLOAD_SITE_CONFIG: DownloadSiteConfig = {
  productName: 'Stickmations',
  news: {
    title: 'Project save and import are now available',
    description:
      'Keep your animation in a compact project file and reopen it whenever you need.',
    publishedAt: '2026-09-01',
    publishedLabel: 'September 2026',
  },
  editions: [
    {
      name: 'Stickmations',
      actionLabel: 'Download',
      url: null,
    },
    {
      name: 'Pro',
      status: 'Release soon',
      actionLabel: 'Download Pro',
      url: null,
    },
  ],
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
