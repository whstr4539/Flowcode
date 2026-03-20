const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  platform: process.platform,
  versions: process.versions,
  executePython: (code) => ipcRenderer.invoke('execute-python', code)
});
