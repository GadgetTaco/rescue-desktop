'use strict';
const { app, BrowserWindow, ipcMain, shell, Menu, screen,
        globalShortcut, dialog } = require('electron');
const { autoUpdater } = require('electron-updater');
const { execSync }    = require('child_process');
const path = require('path');

// ─── Constants ────────────────────────────────────────────────────────────────
const NUC_IP     = '192.168.50.1';
const NUC_URL    = 'http://' + NUC_IP + '/rescue';
const AWARE_SSID = 'AWARE-Training-Site';
const AWARE_PASS = 'RescueTraining2025';
const IS_DEV     = process.env.NODE_ENV === 'development';

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

// ─── WiFi helpers (Windows only) ─────────────────────────────────────────────
function getCurrentWifiSSID() {
  try {
    const out = execSync('netsh wlan show interfaces', { encoding: 'utf8', timeout: 5000 });
    const m   = out.match(/^\s+SSID\s+:\s+(.+)$/m);
    return m ? m[1].trim() : null;
  } catch (_) { return null; }
}

function connectToAwareWifi() {
  try {
    execSync('netsh wlan connect name="' + AWARE_SSID + '"', { timeout: 8000 });
    return true;
  } catch (_) { return false; }
}

function setWifiAutoPriority() {
  try {
    execSync(
      'netsh wlan set profileorder name="' + AWARE_SSID + '" interface="Wi-Fi" priority=1',
      { timeout: 5000 }
    );
  } catch (_) {}
}

async function checkAndPromptWifi(win) {
  if (process.platform !== 'win32') return; // Mac / dev — skip entirely

  const ssid = getCurrentWifiSSID();
  if (ssid === AWARE_SSID) {
    setWifiAutoPriority(); // already correct — ensure priority silently
    return;
  }

  const { response } = await dialog.showMessageBox(win, {
    type:      'warning',
    title:     'Wrong WiFi Network',
    message:   'Not connected to ' + AWARE_SSID,
    detail:    'This tablet is on "' + (ssid || 'no network') + '". ' +
               'RESCUE NextGen\u2122 requires the ' + AWARE_SSID + ' training network ' +
               'to reach the edge server.\n\nConnect now?',
    buttons:   ['Connect to ' + AWARE_SSID, 'Continue Anyway'],
    defaultId: 0,
    cancelId:  1,
    icon:      path.join(__dirname, 'assets', 'rescue-icon.png'),
  });

  if (response === 0) {
    const ok = connectToAwareWifi();
    if (ok) {
      setWifiAutoPriority();
      await new Promise(r => setTimeout(r, 3000));
    } else {
      await dialog.showMessageBox(win, {
        type:    'info',
        title:   'Connect Manually',
        message: 'Please connect manually, then relaunch RESCUE.',
        detail:  'Network:  ' + AWARE_SSID + '\nPassword: ' + AWARE_PASS + '\n\n' +
                 'Once connected, RESCUE will auto-prioritise this network in future.',
        buttons: ['OK'],
        icon:    path.join(__dirname, 'assets', 'rescue-icon.png'),
      });
    }
  }
}

// ─── Auto-updater config ──────────────────────────────────────────────────────
function setupAutoUpdater() {
  if (IS_DEV) return;

  autoUpdater.autoDownload         = true;
  autoUpdater.autoInstallOnAppQuit = true;
  autoUpdater.logger               = require('electron-log');
  autoUpdater.logger.transports.file.level = 'info';

  // NUC-local update server — tablets update over training WiFi, no internet needed.
  // Jeff deploys: scp dist/RESCUE-NextGen-Setup-X.X.X.exe dist/latest.yml aware@NUC:/updates/
  autoUpdater.setFeedURL({ provider: 'generic', url: 'http://' + NUC_IP + '/updates/' });

  autoUpdater.checkForUpdates().catch(() => {});
  setInterval(() => autoUpdater.checkForUpdates().catch(() => {}), 4 * 60 * 60 * 1000);

  autoUpdater.on('update-downloaded', (info) => {
    mainWindow?.webContents.send('update:ready', {
      version:      info.version,
      releaseNotes: info.releaseNotes || '',
    });
  });

  autoUpdater.on('error', (err) => {
    console.log('Auto-updater (non-fatal):', err.message);
  });
}

// ─── Create main window ───────────────────────────────────────────────────────
function createWindow() {
  const { width, height } = screen.getPrimaryDisplay().workAreaSize;

  const win = new BrowserWindow({
    width:           Math.min(1920, width),
    height:          Math.min(1080, height),
    minWidth:        1024,
    minHeight:       640,
    icon:            path.join(__dirname, 'assets', 'rescue-icon.png'),
    frame:           false,
    titleBarStyle:   'hidden',
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
    if (!url.startsWith('file://') && !url.startsWith('http://' + NUC_IP)) {
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

ipcMain.on('window:minimize',     () => mainWindow?.minimize());
ipcMain.on('window:maximize',     () => {
  mainWindow?.isMaximized() ? mainWindow.unmaximize() : mainWindow?.maximize();
});
ipcMain.on('window:close',        () => mainWindow?.close());
ipcMain.on('window:is-maximized', (event) => {
  event.returnValue = mainWindow?.isMaximized() ?? false;
});
ipcMain.on('open:external', (_event, url) => {
  if (typeof url === 'string' && (url.startsWith('http://') || url.startsWith('https://'))) {
    shell.openExternal(url);
  }
});
ipcMain.on('update:install', () => autoUpdater.quitAndInstall(false, true));

ipcMain.handle('get:config', () => ({
  nucUrl:  NUC_URL,
  version: app.getVersion(),
}));

// ─── App lifecycle ────────────────────────────────────────────────────────────
app.whenReady().then(async () => {
  Menu.setApplicationMenu(null);

  globalShortcut.register('F11', () => {
    if (mainWindow) mainWindow.setFullScreen(!mainWindow.isFullScreen());
  });

  mainWindow = createWindow();
  await checkAndPromptWifi(mainWindow);
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