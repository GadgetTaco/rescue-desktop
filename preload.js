'use strict';

const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('rescueApp', {
  // Window controls
  minimize:     () => ipcRenderer.send('window:minimize'),
  maximize:     () => ipcRenderer.send('window:maximize'),
  close:        () => ipcRenderer.send('window:close'),
  isMaximized:  () => ipcRenderer.sendSync('window:is-maximized'),

  // Open any URL in the real system browser
  openExternal: (url) => ipcRenderer.send('open:external', url),

  // Get NUC URL + app version from main process
  getConfig: () => ipcRenderer.invoke('get:config'),

  // Listen for maximize/restore state changes
  onMaximizedChange: (callback) => {
    ipcRenderer.on('window:maximized-change', (_e, isMax) => callback(isMax));
  },

  // Auto-updater: notify renderer when update downloaded and ready
  onUpdateReady: (callback) => {
    ipcRenderer.on('update:ready', (_e, info) => callback(info));
  },

  // Trigger install + restart
  installUpdate: () => ipcRenderer.send('update:install'),
});
