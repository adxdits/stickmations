import { bootstrapApplication } from '@angular/platform-browser';
import { appConfig } from './app/app.config';

const rootComponent = window.framationDesktop
  ? import('./app/app').then(({ App }) => App)
  : import('./website/download-site/download-site').then(({ DownloadSite }) => DownloadSite);

rootComponent
  .then((component) => bootstrapApplication(component, appConfig))
  .catch((error: unknown) => console.error(error));
