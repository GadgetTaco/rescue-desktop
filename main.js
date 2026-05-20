'use strict';

const { app, BrowserWindow, ipcMain, dialog, session, Menu } = require('electron');
const { autoUpdater } = require('electron-updater');
const { execSync }    = require('child_process');
const path            = require('path');
const log             = require('electron-log');

// Accept self-signed NUC cert for auto-updater HTTP client
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

autoUpdater.logger = log;
autoUpdater.logger.transports.file.level = 'info';
log.info('RESCUE NextGen starting - v' + app.getVersion());

const NUC_URL    = 'http://192.168.50.1';   // app content + API (HTTP on LAN)
const WIFI_SSID  = 'AWARE-Training-Site';
const WIFI_PASS  = 'RescueTraining2025';
const UPDATE_URL = 'https://192.168.50.1/updates/';

let mainWindow  = null;
let updateReady = false;

// ─── Trust self-signed NUC cert in webContents (iframe) ─────────────────────
function trustNucCert () {
  session.defaultSession.setCertificateVerifyProc((req, callback) => {
    callback(req.hostname === '192.168.50.1' ? 0 : -3);
  });
}

// ─── WiFi check (Windows only) ───────────────────────────────────────────────
function checkWifi () {
  if (process.platform !== 'win32') return;
  try {
    const out  = execSync('netsh wlan show interfaces', { timeout: 6000 }).toString();
    const m    = out.match(/\s+SSID\s*:\s*(.+)/);
    const ssid = m ? m[1].trim() : '';
    if (ssid === WIFI_SSID) return;
    try { execSync(`netsh wlan connect name="${WIFI_SSID}"`, { timeout: 5000 }); } catch (_) {}
    dialog.showMessageBoxSync({
      type    : 'warning',
      title   : 'WiFi Required',
      message : `Connect to "${WIFI_SSID}" before continuing.`,
      detail  : `Current network: ${ssid || 'none'}\nPassword: ${WIFI_PASS}`,
      buttons : ['OK'],
    });
  } catch (_) { /* not WiFi capable — skip */ }
}

// ─── Main window ─────────────────────────────────────────────────────────────
function createWindow () {
  trustNucCert();

  mainWindow = new BrowserWindow({
    kiosk           : true,
    backgroundColor : '#0d1117',
    title           : 'RESCUE NextGen\u2122',
    webPreferences  : {
      preload          : path.join(__dirname, 'preload.js'),
      contextIsolation : true,
      nodeIntegration  : false,
    },
  });

  mainWindow.loadFile('app.html');

  mainWindow.webContents.on('did-finish-load', () => {
    mainWindow.webContents.send('config', {
      nucUrl  : NUC_URL,
      version : app.getVersion(),
    });
  });
}

// ─── IPC ─────────────────────────────────────────────────────────────────────
ipcMain.handle('get:config',  () => ({ nucUrl: NUC_URL, version: app.getVersion() }));
ipcMain.handle('check:update', () => updateReady);
ipcMain.on('install:update',  () => setImmediate(() => autoUpdater.quitAndInstall()));
ipcMain.on('quit:app',        () => app.quit());

// ─── Auto-updater ─────────────────────────────────────────────────────────────
function setupUpdater () {
  autoUpdater.setFeedURL({ provider: 'generic', url: UPDATE_URL });

  const check = () =>
    autoUpdater.checkForUpdates().catch(e => log.warn('Update check:', e.message));

  check();
  setInterval(check, 4 * 60 * 60 * 1000);  // every 4 hours

  autoUpdater.on('update-downloaded', () => {
    updateReady = true;
    log.info('Update downloaded - ready to install');
    if (mainWindow) mainWindow.webContents.send('update:ready');
  });

  autoUpdater.on('error', e => log.error('Updater:', e.message));
}

// ─── Lifecycle ────────────────────────────────────────────────────────────────
app.whenReady().then(() => {
  Menu.setApplicationMenu(null);  // remove File/Edit/View/Window/Help menu bar
  checkWifi();
  createWindow();
  setupUpdater();
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
