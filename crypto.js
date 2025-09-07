const CryptoJS = require('crypto-js');

// PBKDF2 + AES-256-CBC crypto utility for password manager
// No backwards compatibility with previous formats.
class PasswordCrypto {
  constructor(masterPassword, opts = {}) {
    this.masterPassword = masterPassword;
    this.kdf = opts.kdf || 'pbkdf2-sha256';
    this.iterations = typeof opts.iterations === 'number' ? opts.iterations : 200000;
    this.saltBase64 = opts.salt || null; // base64 string
  }

  static generateSaltBytes(length = 16) {
    const salt = CryptoJS.lib.WordArray.random(length);
    return CryptoJS.enc.Base64.stringify(salt);
  }

  static deriveKey(password, saltBase64, iterations) {
    const salt = CryptoJS.enc.Base64.parse(saltBase64);
    const key = CryptoJS.PBKDF2(password, salt, {
      keySize: 256 / 32,
      iterations,
      hasher: CryptoJS.algo.SHA256
    });
    return key; // WordArray length 32 bytes
  }

  deriveKey() {
    if (!this.saltBase64) {
      throw new Error('Missing KDF salt');
    }
    return PasswordCrypto.deriveKey(this.masterPassword, this.saltBase64, this.iterations);
  }

  encrypt(plaintext) {
    const key = this.deriveKey();
    const iv = CryptoJS.lib.WordArray.random(16);
    const encrypted = CryptoJS.AES.encrypt(plaintext, key, { iv });
    return JSON.stringify({
      v: 1,
      iv: CryptoJS.enc.Base64.stringify(iv),
      ct: encrypted.ciphertext.toString(CryptoJS.enc.Base64)
    });
  }

  decrypt(payload) {
    try {
      const parsed = JSON.parse(payload);
      if (!parsed || typeof parsed !== 'object' || !parsed.iv || !parsed.ct) {
        throw new Error('Invalid ciphertext format');
      }
      const key = this.deriveKey();
      const iv = CryptoJS.enc.Base64.parse(parsed.iv);
      const cipherParams = CryptoJS.lib.CipherParams.create({
        ciphertext: CryptoJS.enc.Base64.parse(parsed.ct)
      });
      const decrypted = CryptoJS.AES.decrypt(cipherParams, key, { iv });
      return decrypted.toString(CryptoJS.enc.Utf8);
    } catch (error) {
      throw new Error('Failed to decrypt data. Wrong master password or corrupted data.');
    }
  }

  // Create new hash record to store on disk for future verification
  createNewHashObject() {
    const salt = PasswordCrypto.generateSaltBytes(16);
    const iterations = this.iterations;
    const dk = PasswordCrypto.deriveKey(this.masterPassword, salt, iterations);
    return {
      version: 2,
      kdf: this.kdf,
      iterations,
      salt,
      hash: dk.toString(CryptoJS.enc.Hex)
    };
  }

  verifyPassword(password, hashObjectOrString) {
    let obj;
    try {
      obj = typeof hashObjectOrString === 'string' ? JSON.parse(hashObjectOrString) : hashObjectOrString;
    } catch (_) {
      return false;
    }
    if (!obj || obj.version !== 2 || obj.kdf !== 'pbkdf2-sha256' || !obj.salt || !obj.iterations || !obj.hash) {
      return false;
    }
    const dk = PasswordCrypto.deriveKey(password, obj.salt, obj.iterations);
    return dk.toString(CryptoJS.enc.Hex) === obj.hash;
  }
}

module.exports = PasswordCrypto;
