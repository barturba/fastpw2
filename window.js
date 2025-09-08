const { BrowserWindow } = require('electron');
const path = require('path');

let mainWindow;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 520,
    height: 420,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      enableRemoteModule: false,
      preload: path.join(__dirname, 'preload.js'),
      webviewTag: false,
      nodeIntegrationInWorker: false,
      nodeIntegrationInSubFrames: false
    },
    icon: path.join(__dirname, 'assets/icon.png'), // Optional icon
    show: false
  });

  // Log the user data path for debugging
  if (process.env.NODE_ENV === 'development') {
    console.log('App userData path:', mainWindow.webContents.session.getStoragePath());
    console.log('App path:', process.resourcesPath || __dirname);
    console.log('App name:', require('electron').app.getName());
  }

  const useViteDev = process.env.FASTPW2_RENDERER_DEV === '1';
  const devServerUrl = process.env.FASTPW2_RENDERER_URL || 'http://localhost:5173';
  if (useViteDev) {
    if (process.env.NODE_ENV === 'development') {
      console.log('Loading renderer from Vite dev server:', devServerUrl);
    }
    mainWindow.loadURL(devServerUrl);
  } else {
    const prodIndex = path.join(__dirname, 'renderer', 'dist', 'index.html');
    if (process.env.NODE_ENV === 'development') {
      console.log('Loading renderer from file:', prodIndex);
    }
    mainWindow.loadFile(prodIndex);
  }

  mainWindow.once('ready-to-show', () => {
    // Start at compact size; renderer will resize on main app show
    mainWindow.center();
    mainWindow.show();
  });

  // Open DevTools in development
  if (process.env.NODE_ENV === 'development') {
    mainWindow.webContents.openDevTools();
  }

  // Disallow external navigation and window opens
  mainWindow.webContents.setWindowOpenHandler(() => ({ action: 'deny' }));
  mainWindow.webContents.on('will-navigate', (event, url) => {
    if (!url || !url.startsWith('file://')) {
      event.preventDefault();
    }
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
  // Ensure app quits when window is closed (including macOS)
  mainWindow.on('close', () => {
    require('electron').app.exit(0);
  });

  return mainWindow;
}

function getMainWindow() {
  return mainWindow;
}

function setWindowSize(width, height, center = true) {
  if (!mainWindow) return { success: false, error: 'No main window' };

  try {
    mainWindow.setSize(Math.max(320, Math.floor(width)), Math.max(240, Math.floor(height)));
    if (center) { mainWindow.center(); }
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

module.exports = {
  createWindow,
  getMainWindow,
  setWindowSize
};
