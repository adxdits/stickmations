import { app, BrowserWindow, Menu, shell } from 'electron';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { Mp4ExportManager } from './mp4-export.js';
import { ProjectSaveManager } from './project-save.js';

const currentDirectory = dirname(fileURLToPath(import.meta.url));
const developmentServerUrl = process.env['STICKMATIONS_DEV_SERVER_URL'];
const appName = 'Stickmations';
const appId = 'com.stickmations.app';
const appIcon = app.isPackaged
  ? join(process.resourcesPath, 'branding/icon.png')
  : join(currentDirectory, '../../build/icon.png');
const mp4Exports = new Mp4ExportManager();
const projectSaves = new ProjectSaveManager();
const externalLinks = new Set([
  'https://discord.gg/5YQTaaC5W',
  'https://www.reddit.com/r/StickmationsOfficial/',
  'https://adxdits.github.io/stickmations/',
  'https://adxdits.github.io/stickmations/#news',
  'https://buymeacoffee.com/adxdits',
  'mailto:adamalmounayar@hotmail.com?subject=Stickmations%20contact%20or%20bug%20report',
]);

app.setName(appName);
app.setAppUserModelId(appId);

// The renderer draws its own menu bar, so Electron's default menu would stack a
// second, unused bar above it on Windows and Linux. macOS keeps a menu because it
// lives in the system menu bar and supplies the standard editing shortcuts.
function applyApplicationMenu(): void {
  if (process.platform !== 'darwin') {
    Menu.setApplicationMenu(null);
    return;
  }

  Menu.setApplicationMenu(
    Menu.buildFromTemplate([{ role: 'appMenu' }, { role: 'editMenu' }, { role: 'windowMenu' }]),
  );
}

function createWindow(): void {
  const window = new BrowserWindow({
    title: appName,
    icon: appIcon,
    width: 1440,
    height: 900,
    minWidth: 960,
    minHeight: 640,
    backgroundColor: '#1d1f21',
    autoHideMenuBar: true,
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      preload: join(currentDirectory, 'preload.cjs'),
    },
  });

  window.webContents.setWindowOpenHandler(({ url }) => {
    if (externalLinks.has(url)) {
      void shell.openExternal(url);
    }
    return { action: 'deny' };
  });

  if (developmentServerUrl) {
    void window.loadURL(developmentServerUrl);
  } else {
    void window.loadFile(
      join(currentDirectory, '../../frontend/dist/frontend/browser/index.html'),
    );
  }

  const senderId = window.webContents.id;
  window.on('closed', () => {
    void Promise.all([
      mp4Exports.cancelForSender(senderId),
      projectSaves.cancelForSender(senderId),
    ]);
  });
}

mp4Exports.register();
projectSaves.register();
await app.whenReady();
app.dock?.setIcon(appIcon);
applyApplicationMenu();
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

app.on('before-quit', () => {
  void Promise.all([mp4Exports.dispose(), projectSaves.dispose()]);
});
