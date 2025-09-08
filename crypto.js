const crypto = require('crypto');

// PBKDF2 + AES-256-GCM crypto utility for password manager
// Uses Node.js built-in crypto for better security and performance
// Increased security: higher iterations, authenticated encryption (GCM)
class PasswordCrypto {
  constructor(masterPassword, opts = {}) {
    this.masterPassword = masterPassword;
    this.kdf = opts.kdf || 'pbkdf2-sha256';
    this.iterations = typeof opts.iterations === 'number' ? opts.iterations : 600000; // OWASP recommended minimum
    this.saltBase64 = opts.salt || null; // base64 string
  }

  static generateSaltBytes(length = 32) {
    return crypto.randomBytes(length).toString('base64');
  }

  static deriveKey(password, saltBase64, iterations) {
    const salt = Buffer.from(saltBase64, 'base64');
    // Derive 32 bytes for AES-256, plus 32 bytes for GCM auth tag
    return crypto.pbkdf2Sync(password, salt, iterations, 64, 'sha256');
  }

  deriveKey() {
    if (!this.saltBase64) {
      throw new Error('Missing KDF salt');
    }
    return PasswordCrypto.deriveKey(this.masterPassword, this.saltBase64, this.iterations);
  }

  encrypt(plaintext) {
    const key = this.deriveKey();
    const iv = crypto.randomBytes(16); // GCM recommended IV size
    const cipher = crypto.createCipher('aes-256-gcm', key.slice(0, 32));

    let encrypted = cipher.update(plaintext, 'utf8', 'hex');
    encrypted += cipher.final('hex');

    const authTag = cipher.getAuthTag();

    return JSON.stringify({
      v: 2, // Version 2 for GCM encryption
      iv: iv.toString('base64'),
      ct: encrypted,
      tag: authTag.toString('base64')
    });
  }

  decrypt(payload) {
    try {
      const parsed = JSON.parse(payload);

      // Support legacy v1 format (CBC) for backwards compatibility
      if (parsed.v === 1) {
        return this.decryptLegacy(payload);
      }

      // New v2 format (GCM)
      if (!parsed || typeof parsed !== 'object' || !parsed.iv || !parsed.ct || !parsed.tag || parsed.v !== 2) {
        throw new Error('Invalid ciphertext format');
      }

      const key = this.deriveKey();
      const iv = Buffer.from(parsed.iv, 'base64');
      const authTag = Buffer.from(parsed.tag, 'base64');

      const decipher = crypto.createDecipher('aes-256-gcm', key.slice(0, 32));
      decipher.setAuthTag(authTag);

      let decrypted = decipher.update(parsed.ct, 'hex', 'utf8');
      decrypted += decipher.final('utf8');

      return decrypted;
    } catch (error) {
      throw new Error('Failed to decrypt data. Wrong master password or corrupted data.');
    }
  }

  // Legacy decryption for v1 (CBC) format
  decryptLegacy(payload) {
    try {
      const parsed = JSON.parse(payload);
      if (!parsed || typeof parsed !== 'object' || !parsed.iv || !parsed.ct || parsed.v !== 1) {
        throw new Error('Invalid legacy ciphertext format');
      }

      const key = this.deriveKey();
      const iv = Buffer.from(parsed.iv, 'base64');
      const decipher = crypto.createDecipher('aes-256-cbc', key.slice(0, 32));

      let decrypted = decipher.update(parsed.ct, 'base64', 'utf8');
      decrypted += decipher.final('utf8');

      return decrypted;
    } catch (error) {
      throw new Error('Failed to decrypt legacy data. Wrong master password or corrupted data.');
    }
  }

  // Create new hash record to store on disk for future verification
  createNewHashObject() {
    const salt = PasswordCrypto.generateSaltBytes(32); // Larger salt for better security
    const iterations = this.iterations;
    const dk = PasswordCrypto.deriveKey(this.masterPassword, salt, iterations);
    return {
      version: 3, // Version 3 for new crypto
      kdf: this.kdf,
      iterations,
      salt,
      hash: dk.slice(0, 32).toString('hex') // Use first 32 bytes as hash
    };
  }

  verifyPassword(password, hashObjectOrString) {
    let obj;
    try {
      obj = typeof hashObjectOrString === 'string' ? JSON.parse(hashObjectOrString) : hashObjectOrString;
    } catch (_) {
      return false;
    }

    // Support multiple versions for backwards compatibility
    if (obj.version === 3) {
      if (!obj || obj.kdf !== 'pbkdf2-sha256' || !obj.salt || !obj.iterations || !obj.hash) {
        return false;
      }
      const dk = PasswordCrypto.deriveKey(password, obj.salt, obj.iterations);
      return crypto.timingSafeEqual(Buffer.from(dk.slice(0, 32)), Buffer.from(obj.hash, 'hex'));
    } else if (obj.version === 2) {
      // Legacy version 2 support (crypto-js format)
      return this.verifyLegacyPassword(password, obj);
    }

    return false;
  }

  // Legacy password verification for older versions
  verifyLegacyPassword(password, obj) {
    if (!obj || obj.version !== 2 || obj.kdf !== 'pbkdf2-sha256' || !obj.salt || !obj.iterations || !obj.hash) {
      return false;
    }

    // Reconstruct crypto-js style key derivation for compatibility
    const salt = Buffer.from(obj.salt, 'base64');
    const dk = crypto.pbkdf2Sync(password, salt, obj.iterations, 32, 'sha256');
    return dk.toString('hex') === obj.hash;
  }
}

module.exports = PasswordCrypto;
