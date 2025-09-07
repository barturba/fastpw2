const { app, BrowserWindow, ipcMain, dialog } = require('electron');
const path = require('path');
const fs = require('fs').promises;
const PasswordCrypto = require('./crypto');
const keytar = require('keytar');

let mainWindow;

// Keychain-based 14-day cache for master password
const KEYCHAIN_SERVICE = app.getName ? app.getName() : 'fastpw2';
const KEYCHAIN_ACCOUNT = 'master-password';
const CACHE_TTL_MS = 14 * 24 * 60 * 60 * 1000;

async function readCacheRecord() {
  try {
    const raw = await keytar.getPassword(KEYCHAIN_SERVICE, KEYCHAIN_ACCOUNT);
    if (!raw) return null;
    try {
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed.value === 'string') return parsed;
    } catch (_) {
      // Backward compatibility: plain string stored previously
      return { value: raw, lastUsedAt: 0 };
    }
    return null;
  } catch (e) {
    return null;
  }
}

async function getCachedMasterPassword() {
  const rec = await readCacheRecord();
  if (!rec) return null;
  const lastUsedAt = typeof rec.lastUsedAt === 'number' ? rec.lastUsedAt : 0;
  if (Date.now() - lastUsedAt > CACHE_TTL_MS) {
    try { await keytar.deletePassword(KEYCHAIN_SERVICE, KEYCHAIN_ACCOUNT); } catch (_) {}
    return null;
  }
  return rec.value;
}

async function saveCachedMasterPassword(password) {
  if (!password) return;
  const record = JSON.stringify({ value: password, lastUsedAt: Date.now() });
  try {
    await keytar.setPassword(KEYCHAIN_SERVICE, KEYCHAIN_ACCOUNT, record);
  } catch (_) {}
}

async function touchCachedMasterPassword() {
  const rec = await readCacheRecord();
  if (!rec) return;
  rec.lastUsedAt = Date.now();
  try {
    await keytar.setPassword(KEYCHAIN_SERVICE, KEYCHAIN_ACCOUNT, JSON.stringify(rec));
  } catch (_) {}
}

async function clearCachedMasterPassword() {
  try {
    await keytar.deletePassword(KEYCHAIN_SERVICE, KEYCHAIN_ACCOUNT);
  } catch (_) {}
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      enableRemoteModule: false,
      preload: path.join(__dirname, 'preload.js')
    },
    icon: path.join(__dirname, 'assets/icon.png'), // Optional icon
    show: false
  });

  // Log the user data path for debugging
  console.log('App userData path:', app.getPath('userData'));
  console.log('App path:', app.getAppPath());
  console.log('App name:', app.getName());

  mainWindow.loadFile('index.html');

  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
  });

  // Open DevTools in development
  if (process.env.NODE_ENV === 'development') {
    mainWindow.webContents.openDevTools();
  }

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
  // Ensure app quits when window is closed (including macOS)
  mainWindow.on('close', () => {
    app.exit(0);
  });
}

app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
  app.exit(0);
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});

// IPC handlers for data management with encryption
ipcMain.handle('save-data', async (event, data) => {
  try {
    const userDataPath = app.getPath('userData');
    const dataPath = path.join(userDataPath, 'passwords.enc');
    const hashPath = path.join(userDataPath, 'master.hash');

    console.log('Saving data. UserData path:', userDataPath);
    console.log('Hash file path:', hashPath);
    console.log('Master password provided:', !!data.masterPassword);

    // Check if master password is set
    let masterHash;
    try {
      masterHash = await fs.readFile(hashPath, 'utf8');
      console.log('Master hash read successfully');
    } catch (error) {
      console.error('Error reading master hash file:', error);
      return { success: false, error: 'Master password not set' };
    }

    const crypto = new PasswordCrypto(data.masterPassword);

    if (!crypto.verifyPassword(data.masterPassword, masterHash)) {
      return { success: false, error: 'Incorrect master password' };
    }

    // Encrypt and save data
    const encryptedData = crypto.encrypt(JSON.stringify(data.entries));
    await fs.writeFile(dataPath, encryptedData);
    // Refresh cache TTL on successful save
    touchCachedMasterPassword();

    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('load-data', async (event, masterPassword) => {
  try {
    const dataPath = path.join(app.getPath('userData'), 'passwords.enc');
    const hashPath = path.join(app.getPath('userData'), 'master.hash');

    // Check if master password is set
    let masterHash;
    try {
      masterHash = await fs.readFile(hashPath, 'utf8');
    } catch (error) {
      // First time setup - no master password set
      return { success: true, data: [], needsSetup: true };
    }

    const crypto = new PasswordCrypto(masterPassword);

    if (!crypto.verifyPassword(masterPassword, masterHash)) {
      return { success: false, error: 'Incorrect master password' };
    }

    // Decrypt and load data
    try {
      const encryptedData = await fs.readFile(dataPath, 'utf8');
      const decryptedData = crypto.decrypt(encryptedData);
      // Refresh cache TTL on successful load
      touchCachedMasterPassword();
      return { success: true, data: JSON.parse(decryptedData) };
    } catch (error) {
      // Return empty array if file doesn't exist or can't be decrypted
      return { success: true, data: [] };
    }
  } catch (error) {
    return { success: true, data: [] };
  }
});

ipcMain.handle('set-master-password', async (event, masterPassword) => {
  try {
    const userDataPath = app.getPath('userData');
    const hashPath = path.join(userDataPath, 'master.hash');
    console.log('Setting master password. UserData path:', userDataPath);
    console.log('Hash file path:', hashPath);

    // Ensure the userData directory exists
    try {
      await fs.mkdir(userDataPath, { recursive: true });
    } catch (mkdirError) {
      console.log('UserData directory already exists or error creating:', mkdirError.message);
    }

    const crypto = new PasswordCrypto(masterPassword);
    const hash = crypto.hashPassword(masterPassword);
    await fs.writeFile(hashPath, hash);

    // Verify the file was created
    const fileExists = await fs.access(hashPath).then(() => true).catch(() => false);
    console.log('Hash file created successfully:', fileExists);

    // Store in keychain for 14-day cache
    await saveCachedMasterPassword(masterPassword);

    return { success: true };
  } catch (error) {
    console.error('Error setting master password:', error);
    return { success: false, error: error.message };
  }
});

ipcMain.handle('verify-master-password', async (event, masterPassword) => {
  try {
    const hashPath = path.join(app.getPath('userData'), 'master.hash');
    const hash = await fs.readFile(hashPath, 'utf8');
    const crypto = new PasswordCrypto(masterPassword);
    return { success: true, valid: crypto.verifyPassword(masterPassword, hash) };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('debug-hash-file', async () => {
  try {
    const hashPath = path.join(app.getPath('userData'), 'master.hash');
    const exists = await fs.access(hashPath).then(() => true).catch(() => false);
    let hashContent = null;
    if (exists) {
      try {
        hashContent = await fs.readFile(hashPath, 'utf8');
      } catch (readError) {
        hashContent = 'Error reading file: ' + readError.message;
      }
    }
    return {
      success: true,
      exists,
      hashPath,
      hashContent: hashContent ? hashContent.substring(0, 20) + '...' : null
    };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

// Keychain cache IPC endpoints
ipcMain.handle('cache-get-master', async () => {
  try {
    const value = await getCachedMasterPassword();
    return { success: true, value };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('cache-save-master', async (event, password) => {
  try {
    if (!password) return { success: false, error: 'Missing password' };
    await saveCachedMasterPassword(password);
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('cache-touch-master', async () => {
  try {
    await touchCachedMasterPassword();
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('cache-clear-master', async () => {
  try {
    await clearCachedMasterPassword();
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
});
