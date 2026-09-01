import { bootstrapApplication } from '@angular/platform-browser';
import { appConfig } from './app.config';
import { DownloadSite } from './app/download-site/download-site';

bootstrapApplication(DownloadSite, appConfig).catch((error: unknown) =>
  console.error(error),
);
