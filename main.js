const { app, BrowserWindow, ipcMain, dialog } = require('electron');
const path = require('path');
const fs = require('fs').promises;
const PasswordCrypto = require('./crypto');
const keytar = require('keytar');
const crypto = require('crypto');

let mainWindow;

// Keychain-based 14-day cache for master password verification token
const KEYCHAIN_SERVICE = app.getName ? app.getName() : 'fastpw2';
const KEYCHAIN_ACCOUNT = 'master-password-token';
const CACHE_TTL_MS = 14 * 24 * 60 * 60 * 1000;
const CACHE_ENABLED = process.env.FASTPW2_ENABLE_CACHE === '1';

// Generate a secure verification token from master password
function generateVerificationToken(password) {
  if (!password || typeof password !== 'string') return null;
  // Use PBKDF2 with random salt to derive a verification token
  const salt = crypto.randomBytes(32);
  const token = crypto.pbkdf2Sync(password, salt, 100000, 32, 'sha256');
  return {
    token: token.toString('base64'),
    salt: salt.toString('base64'),
    algorithm: 'pbkdf2-sha256',
    iterations: 100000
  };
}

// Verify a password against a stored verification token
function verifyAgainstToken(password, tokenData) {
  if (!password || !tokenData || typeof tokenData !== 'object') return false;
  try {
    const salt = Buffer.from(tokenData.salt, 'base64');
    const storedToken = Buffer.from(tokenData.token, 'base64');
    const derivedToken = crypto.pbkdf2Sync(password, salt, tokenData.iterations, 32, 'sha256');
    return crypto.timingSafeEqual(derivedToken, storedToken);
  } catch (e) {
    return false;
  }
}

async function readCacheRecord() {
  try {
    if (!CACHE_ENABLED) return null;
    const raw = await keytar.getPassword(KEYCHAIN_SERVICE, KEYCHAIN_ACCOUNT);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed.tokenData === 'object' && typeof parsed.lastUsedAt === 'number') return parsed;
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
    try { if (CACHE_ENABLED) { await keytar.deletePassword(KEYCHAIN_SERVICE, KEYCHAIN_ACCOUNT); } } catch (_) {}
    return null;
  }
  return rec.tokenData;
}

async function saveCachedMasterPassword(password) {
  if (!CACHE_ENABLED) return;
  if (!password || typeof password !== 'string' || password.trim().length === 0) return;

  const tokenData = generateVerificationToken(password);
  if (!tokenData) return;

  const record = JSON.stringify({
    tokenData: tokenData,
    lastUsedAt: Date.now(),
    version: 1
  });

  try {
    await keytar.setPassword(KEYCHAIN_SERVICE, KEYCHAIN_ACCOUNT, record);
  } catch (error) {
    console.error('Failed to save cache:', error);
  }
}

async function touchCachedMasterPassword() {
  const rec = await readCacheRecord();
  if (!rec) return;
  rec.lastUsedAt = Date.now();
  try {
    if (CACHE_ENABLED) {
      await keytar.setPassword(KEYCHAIN_SERVICE, KEYCHAIN_ACCOUNT, JSON.stringify(rec));
    }
  } catch (error) {
    console.error('Failed to touch cache:', error);
  }
}

async function clearCachedMasterPassword() {
  try {
    if (CACHE_ENABLED) {
      await keytar.deletePassword(KEYCHAIN_SERVICE, KEYCHAIN_ACCOUNT);
    }
  } catch (error) {
    console.error('Failed to clear cache:', error);
  }
}

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
    console.log('App userData path:', app.getPath('userData'));
    console.log('App path:', app.getAppPath());
    console.log('App name:', app.getName());
  }

  mainWindow.loadFile('index.html');

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

    if (process.env.NODE_ENV === 'development') {
      console.log('Saving data. UserData path:', userDataPath);
      console.log('Hash file path:', hashPath);
      console.log('Master password provided:', !!data.masterPassword);
    }

    // Check if master password is set
    let masterHash;
    try {
      masterHash = await fs.readFile(hashPath, 'utf8');
      if (process.env.NODE_ENV === 'development') {
        console.log('Master hash read successfully');
      }
    } catch (error) {
      if (process.env.NODE_ENV === 'development') {
        console.error('Error reading master hash file:', error);
      }
      return { success: false, error: 'Master password not set' };
    }

    const cryptoVerifier = new PasswordCrypto(data.masterPassword);
    if (!cryptoVerifier.verifyPassword(data.masterPassword, masterHash)) {
      return { success: false, error: 'Incorrect master password' };
    }

    // Encrypt and save data
    const hashObj = JSON.parse(masterHash);
    const crypto = new PasswordCrypto(data.masterPassword, { salt: hashObj.salt, iterations: hashObj.iterations });
    const encryptedData = crypto.encrypt(JSON.stringify(data.entries));
    // Ensure directory exists
    try { await fs.mkdir(userDataPath, { recursive: true }); } catch (_) {}
    await fs.writeFile(dataPath, encryptedData, { mode: 0o600 });
    try { await fs.chmod(dataPath, 0o600); } catch (_) {}
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

    const cryptoVerifier = new PasswordCrypto(masterPassword);
    if (!cryptoVerifier.verifyPassword(masterPassword, masterHash)) {
      return { success: false, error: 'Incorrect master password' };
    }

    // Decrypt and load data
    try {
      const encryptedData = await fs.readFile(dataPath, 'utf8');
      const hashObj = JSON.parse(masterHash);
      const crypto = new PasswordCrypto(masterPassword, { salt: hashObj.salt, iterations: hashObj.iterations });
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
    if (!masterPassword || typeof masterPassword !== 'string' || masterPassword.trim().length < 8) {
      return { success: false, error: 'Invalid master password' };
    }
    const userDataPath = app.getPath('userData');
    const hashPath = path.join(userDataPath, 'master.hash');
    if (process.env.NODE_ENV === 'development') {
      console.log('Setting master password. UserData path:', userDataPath);
      console.log('Hash file path:', hashPath);
    }

    // Ensure the userData directory exists
    try {
      await fs.mkdir(userDataPath, { recursive: true });
    } catch (mkdirError) {
      if (process.env.NODE_ENV === 'development') {
        console.log('UserData directory already exists or error creating:', mkdirError.message);
      }
    }

    const crypto = new PasswordCrypto(masterPassword);
    const hashObject = crypto.createNewHashObject();
    await fs.writeFile(hashPath, JSON.stringify(hashObject, null, 2), { mode: 0o600 });
    try { await fs.chmod(hashPath, 0o600); } catch (_) {}

    // Verify the file was created
    const fileExists = await fs.access(hashPath).then(() => true).catch(() => false);
    if (process.env.NODE_ENV === 'development') {
      console.log('Hash file created successfully:', fileExists);
    }

    // Clear any existing cache before setting new master password
    await clearCachedMasterPassword();

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
    if (process.env.NODE_ENV !== 'development') {
      return { success: false, error: 'Not available in production' };
    }
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

// Minimal first-run check (safe for production)
ipcMain.handle('check-first-run', async () => {
  try {
    const hashPath = path.join(app.getPath('userData'), 'master.hash');
    const exists = await fs.access(hashPath).then(() => true).catch(() => false);
    return { success: true, exists };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

// Keychain cache IPC endpoints
ipcMain.handle('cache-get-master', async () => {
  try {
    if (!CACHE_ENABLED) return { success: true, tokenData: null };
    const tokenData = await getCachedMasterPassword();
    return { success: true, tokenData };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('cache-save-master', async (event, password) => {
  try {
    if (!CACHE_ENABLED) return { success: true };
    if (!password || typeof password !== 'string' || password.trim().length === 0) {
      return { success: false, error: 'Missing password' };
    }
    await saveCachedMasterPassword(password);
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('cache-verify-master', async (event, password) => {
  try {
    if (!CACHE_ENABLED) return { success: true, valid: false };
    if (!password || typeof password !== 'string' || password.trim().length === 0) {
      return { success: false, error: 'Missing password' };
    }
    const tokenData = await getCachedMasterPassword();
    if (!tokenData) return { success: true, valid: false };
    const valid = verifyAgainstToken(password, tokenData);
    if (valid) {
      // Refresh cache TTL on successful verification
      await touchCachedMasterPassword();
    }
    return { success: true, valid };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('cache-touch-master', async () => {
  try {
    if (!CACHE_ENABLED) return { success: true };
    await touchCachedMasterPassword();
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('cache-clear-master', async () => {
  try {
    if (!CACHE_ENABLED) return { success: true };
    await clearCachedMasterPassword();
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

// Window size control
ipcMain.handle('set-window-size', async (event, args) => {
  try {
    const { width, height, center } = args || {};
    const win = BrowserWindow.fromWebContents(event.sender) || mainWindow;
    if (!win || typeof width !== 'number' || typeof height !== 'number') {
      return { success: false, error: 'Invalid window or size' };
    }
    win.setSize(Math.max(320, Math.floor(width)), Math.max(240, Math.floor(height)));
    if (center) { win.center(); }
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
});
