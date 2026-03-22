'use strict';

const { app, BrowserWindow, ipcMain, shell, Menu, screen } = require('electron');
const path = require('path');

// ─── Constants ───────────────────────────────────────────────────────────────
const NUC_IP   = '192.168.50.1';
const NUC_URL  = `http://${NUC_IP}/rescue`;
const IS_DEV   = process.env.NODE_ENV === 'development';

// ─── Remove default app menu completely ──────────────────────────────────────
Menu.setApplicationMenu(null);

// ─── Create main window ──────────────────────────────────────────────────────
function createWindow() {
  const { width, height } = screen.getPrimaryDisplay().workAreaSize;

  const win = new BrowserWindow({
    width:  Math.min(1920, width),
    height: Math.min(1080, height),
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

  win.loadFile(path.join(__dirname, 'app.html'));

  win.once('ready-to-show', () => {
    win.show();
    if (IS_DEV) win.webContents.openDevTools({ mode: 'detach' });
  });

  // Block navigation away from the NUC or our wrapper
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

// ─── IPC handlers ────────────────────────────────────────────────────────────
let mainWindow;

ipcMain.on('window:minimize',  () => mainWindow?.minimize());
ipcMain.on('window:maximize',  () => {
  mainWindow?.isMaximized() ? mainWindow.unmaximize() : mainWindow?.maximize();
});
ipcMain.on('window:close',     () => mainWindow?.close());
ipcMain.on('window:is-maximized', (event) => {
  event.returnValue = mainWindow?.isMaximized() ?? false;
});

// Open any URL in the real system browser
ipcMain.on('open:external', (_event, url) => {
  // Whitelist: only allow http/https URLs
  if (typeof url === 'string' && (url.startsWith('http://') || url.startsWith('https://'))) {
    shell.openExternal(url);
  }
});

// Pass NUC URL to renderer
ipcMain.handle('get:config', () => ({ nucUrl: NUC_URL }));

// ─── App lifecycle ────────────────────────────────────────────────────────────
app.whenReady().then(() => {
  mainWindow = createWindow();

  mainWindow.on('maximize',   () => mainWindow.webContents.send('window:maximized-change', true));
  mainWindow.on('unmaximize', () => mainWindow.webContents.send('window:maximized-change', false));

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) mainWindow = createWindow();
  });
});

app.on('window-all-closed', () => app.quit());
