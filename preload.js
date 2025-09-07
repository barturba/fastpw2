const { contextBridge, ipcRenderer } = require('electron');

// Expose protected methods that allow the renderer process to use
// the ipcRenderer without exposing the entire object
const api = {
  saveData: (data) => ipcRenderer.invoke('save-data', data),
  loadData: (masterPassword) => ipcRenderer.invoke('load-data', masterPassword),
  setMasterPassword: (password) => ipcRenderer.invoke('set-master-password', password),
  verifyMasterPassword: (password) => ipcRenderer.invoke('verify-master-password', password),
  debugHashFile: () => ipcRenderer.invoke('debug-hash-file'),
  checkFirstRun: () => ipcRenderer.invoke('check-first-run'),
  cacheGetMaster: () => ipcRenderer.invoke('cache-get-master'),
  cacheSaveMaster: (password) => ipcRenderer.invoke('cache-save-master', password),
  cacheTouchMaster: () => ipcRenderer.invoke('cache-touch-master'),
  cacheClearMaster: () => ipcRenderer.invoke('cache-clear-master'),
  setWindowSize: (width, height, center = true) => ipcRenderer.invoke('set-window-size', { width, height, center })
};

try {
  contextBridge.exposeInMainWorld('electronAPI', Object.freeze(api));
} catch (_) {
  // In case contextIsolation is off in dev, still attach safely
  // eslint-disable-next-line no-undef
  window.electronAPI = Object.freeze(api);
}
