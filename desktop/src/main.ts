import { app, BrowserWindow } from 'electron';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { Mp4ExportManager } from './mp4-export.js';

const currentDirectory = dirname(fileURLToPath(import.meta.url));
const developmentServerUrl = process.env['FRAMATION_DEV_SERVER_URL'];
const mp4Exports = new Mp4ExportManager();

function createWindow(): void {
  const window = new BrowserWindow({
    width: 1440,
    height: 900,
    minWidth: 960,
    minHeight: 640,
    backgroundColor: '#1d1f21',
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      preload: join(currentDirectory, 'preload.cjs'),
    },
  });

  if (developmentServerUrl) {
    void window.loadURL(developmentServerUrl);
  } else {
    void window.loadFile(
      join(currentDirectory, '../../frontend/dist/frontend/browser/index.html'),
    );
  }

  const senderId = window.webContents.id;
  window.on('closed', () => void mp4Exports.cancelForSender(senderId));
}

mp4Exports.register();
await app.whenReady();
createWindow();

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('before-quit', () => void mp4Exports.dispose());
