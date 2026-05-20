'use strict';

const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('rescueApp', {
  getConfig    : ()   => ipcRenderer.invoke('get:config'),
  checkUpdate  : ()   => ipcRenderer.invoke('check:update'),
  installUpdate: ()   => ipcRenderer.send('install:update'),
  onUpdateReady: (cb) => ipcRenderer.on('update:ready', (_e) => cb()),
  quit         : ()   => ipcRenderer.send('quit:app'),
});
