const CryptoJS = require('crypto-js');

// Simple encryption/decryption utility for password manager
// Note: In a production app, you'd want to use more secure methods
class PasswordCrypto {
  constructor(masterPassword) {
    this.masterPassword = masterPassword;
  }

  encrypt(text) {
    return CryptoJS.AES.encrypt(text, this.masterPassword).toString();
  }

  decrypt(ciphertext) {
    try {
      const bytes = CryptoJS.AES.decrypt(ciphertext, this.masterPassword);
      return bytes.toString(CryptoJS.enc.Utf8);
    } catch (error) {
      throw new Error('Failed to decrypt data. Wrong master password?');
    }
  }

  // Hash master password for storage verification
  hashPassword(password) {
    return CryptoJS.SHA256(password).toString();
  }

  verifyPassword(password, hash) {
    return this.hashPassword(password) === hash;
  }
}

module.exports = PasswordCrypto;
