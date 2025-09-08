const { app, BrowserWindow } = require('electron');
const windowManager = require('./window');
const ipcHandlers = require('./ipc-handlers');

// Initialize IPC handlers
ipcHandlers.setupIPCHandlers();

// App event handlers
app.whenReady().then(() => {
  windowManager.createWindow();
});

app.on('window-all-closed', () => {
  app.exit(0);
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    windowManager.createWindow();
  }
});
