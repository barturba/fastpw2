const keytar = require('keytar');
const crypto = require('crypto');

const KEYCHAIN_SERVICE = 'fastpw2';
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

async function verifyCachedMasterPassword(password) {
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
}

module.exports = {
  getCachedMasterPassword,
  saveCachedMasterPassword,
  touchCachedMasterPassword,
  clearCachedMasterPassword,
  verifyCachedMasterPassword
};
