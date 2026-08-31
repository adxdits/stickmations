export interface DownloadEdition {
  readonly name: string;
  readonly price: string;
  readonly billingPeriod?: string;
  readonly actionLabel: string;
  readonly available: boolean;
  readonly url: string | null;
  readonly limitation?: string;
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

export interface CreatorProfile {
  readonly name: string;
  readonly description: string;
  readonly linkedinUrl: string;
  readonly githubUrl: string;
  readonly email: string;
}

export interface DownloadSiteConfig {
  readonly productName: string;
  readonly editions: readonly DownloadEdition[];
  readonly features: readonly SiteFeature[];
  readonly figureResources: readonly FigureResource[];
  readonly creator: CreatorProfile;
  readonly copyright: string;
}

export const DOWNLOAD_SITE_CONFIG: DownloadSiteConfig = {
  productName: 'Stickmations',
  editions: [
    {
      name: 'Lite',
      price: 'Free',
      actionLabel: 'Download Lite',
      available: false,
      url: null,
      limitation: 'Cannot save projects',
    },
    {
      name: 'Premium',
      price: '$4.99',
      billingPeriod: 'per month',
      actionLabel: 'Download Premium',
      available: false,
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
    linkedinUrl: 'https://www.linkedin.com/in/adam-al-mounayar-0b6a5026b/',
    githubUrl: 'https://github.com/adxdits',
    email: 'adamalmounayar@hotmail.com',
  },
  copyright: '© 2026 Stickmations',
};
