import { contextBridge } from 'electron';

contextBridge.exposeInMainWorld('framationDesktop', {
  platform: process.platform,
  versions: {
    chrome: process.versions.chrome,
    electron: process.versions.electron,
  },
});
