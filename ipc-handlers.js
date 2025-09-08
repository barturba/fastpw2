const { ipcMain, app, BrowserWindow } = require('electron');
const path = require('path');
const fs = require('fs').promises;
const PasswordCrypto = require('./crypto');
const cache = require('./cache');
const windowManager = require('./window');

async function setupIPCHandlers() {
  // Data management with encryption
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
      await cache.touchCachedMasterPassword();

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
        await cache.touchCachedMasterPassword();
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
      await cache.clearCachedMasterPassword();

      // Store in keychain for 14-day cache
      await cache.saveCachedMasterPassword(masterPassword);

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
      const tokenData = await cache.getCachedMasterPassword();
      return { success: true, tokenData };
    } catch (error) {
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('cache-save-master', async (event, password) => {
    try {
      await cache.saveCachedMasterPassword(password);
      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('cache-verify-master', async (event, password) => {
    return await cache.verifyCachedMasterPassword(password);
  });

  ipcMain.handle('cache-touch-master', async () => {
    try {
      await cache.touchCachedMasterPassword();
      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('cache-clear-master', async () => {
    try {
      await cache.clearCachedMasterPassword();
      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  });

  // Window size control
  ipcMain.handle('set-window-size', async (event, args) => {
    const { width, height, center } = args || {};
    const win = BrowserWindow.fromWebContents(event.sender) || windowManager.getMainWindow();
    if (!win || typeof width !== 'number' || typeof height !== 'number') {
      return { success: false, error: 'Invalid window or size' };
    }
    return windowManager.setWindowSize(width, height, center);
  });
}

module.exports = {
  setupIPCHandlers
};
