'use strict';

const { app, BrowserWindow, ipcMain, shell, Menu, screen, globalShortcut } = require('electron');
const { autoUpdater } = require('electron-updater');
const path = require('path');

// ─── Constants ────────────────────────────────────────────────────────────────
const NUC_IP = '192.168.50.1';
const NUC_URL = `http://${NUC_IP}/rescue`;
const IS_DEV  = process.env.NODE_ENV === 'development';

// ─── Single instance lock ─────────────────────────────────────────────────────
const gotLock = app.requestSingleInstanceLock();
if (!gotLock) {
  app.quit();
} else {
  app.on('second-instance', () => {
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore();
      mainWindow.focus();
    }
  });
}

// ─── Auto-updater config ──────────────────────────────────────────────────────
function setupAutoUpdater() {
  if (IS_DEV) return; // Never auto-update in dev mode

  // Repo is public — no token needed
  autoUpdater.autoDownload         = true;  // Download silently in background
  autoUpdater.autoInstallOnAppQuit = true;  // Install cleanly on next close

  // Log update activity to console (visible in packaged app logs)
  autoUpdater.logger = require('electron-log');
  autoUpdater.logger.transports.file.level = 'info';

  // Check on startup, then every 4 hours
  autoUpdater.checkForUpdates().catch(() => {});
  setInterval(() => {
    autoUpdater.checkForUpdates().catch(() => {});
  }, 4 * 60 * 60 * 1000);

  // Notify renderer when update is downloaded and ready to install
  autoUpdater.on('update-downloaded', (info) => {
    mainWindow?.webContents.send('update:ready', {
      version: info.version,
      releaseNotes: info.releaseNotes || '',
    });
  });

  // Log errors silently — offline vessels, satellite links etc.
  autoUpdater.on('error', (err) => {
    console.log('Auto-updater (non-fatal):', err.message);
  });
}

// ─── Create main window ───────────────────────────────────────────────────────
function createWindow() {
  const { width, height } = screen.getPrimaryDisplay().workAreaSize;

  const win = new BrowserWindow({
    width:     Math.min(1920, width),
    height:    Math.min(1080, height),
    minWidth:  1024,
    minHeight: 640,
    icon: path.join(__dirname, 'assets', 'rescue-icon.png'),
    frame: false,
    titleBarStyle: 'hidden',
    backgroundColor: '#0e3f56',
    webPreferences: {
      preload:          path.join(__dirname, 'preload.js'),
      nodeIntegration:  false,
      contextIsolation: true,
      devTools:         IS_DEV,
    },
    show: false,
  });

  win.setFullScreen(true);
  win.loadFile(path.join(__dirname, 'app.html'));

  win.once('ready-to-show', () => {
    win.show();
    if (IS_DEV) win.webContents.openDevTools({ mode: 'detach' });
  });

  win.webContents.on('will-navigate', (event, url) => {
    if (!url.startsWith('file://') && !url.startsWith(`http://${NUC_IP}`)) {
      event.preventDefault();
      shell.openExternal(url);
    }
  });

  win.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: 'deny' };
  });

  if (!IS_DEV) {
    win.webContents.on('context-menu', (event) => event.preventDefault());
  }

  return win;
}

// ─── IPC handlers ─────────────────────────────────────────────────────────────
let mainWindow;

ipcMain.on('window:minimize',  () => mainWindow?.minimize());
ipcMain.on('window:maximize',  () => {
  mainWindow?.isMaximized() ? mainWindow.unmaximize() : mainWindow?.maximize();
});
ipcMain.on('window:close',     () => mainWindow?.close());
ipcMain.on('window:is-maximized', (event) => {
  event.returnValue = mainWindow?.isMaximized() ?? false;
});

// Open any URL in real system browser (http/https only)
ipcMain.on('open:external', (_event, url) => {
  if (typeof url === 'string' && (url.startsWith('http://') || url.startsWith('https://'))) {
    shell.openExternal(url);
  }
});

// Install update now (called from renderer when user clicks Install)
ipcMain.on('update:install', () => {
  autoUpdater.quitAndInstall(false, true);
});

// Pass config + app version to renderer
ipcMain.handle('get:config', () => ({
  nucUrl:  NUC_URL,
  version: app.getVersion(), // reads from package.json automatically
}));

// ─── App lifecycle ────────────────────────────────────────────────────────────
app.whenReady().then(() => {
  Menu.setApplicationMenu(null);

  globalShortcut.register('F11', () => {
    if (mainWindow) mainWindow.setFullScreen(!mainWindow.isFullScreen());
  });

  mainWindow = createWindow();
  setupAutoUpdater();

  mainWindow.on('maximize',   () => mainWindow.webContents.send('window:maximized-change', true));
  mainWindow.on('unmaximize', () => mainWindow.webContents.send('window:maximized-change', false));

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) mainWindow = createWindow();
  });
});

app.on('window-all-closed', () => {
  globalShortcut.unregisterAll();
  app.quit();
});
