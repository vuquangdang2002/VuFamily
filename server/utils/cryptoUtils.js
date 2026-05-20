const crypto = require('crypto');
require('dotenv').config();

// Ensure the key is 32 bytes for AES-256
const SECRET_KEY = process.env.CHAT_ENCRYPTION_KEY 
    ? Buffer.from(process.env.CHAT_ENCRYPTION_KEY.padEnd(32, '0').slice(0, 32))
    : Buffer.from('vufamily_default_secret_key_1234'.padEnd(32, '0'));

const ALGORITHM = 'aes-256-gcm';

/**
 * Encrypts a plain text string into a base64 string
 */
function encryptText(text) {
    if (!text) return text;
    try {
        const iv = crypto.randomBytes(16);
        const cipher = crypto.createCipheriv(ALGORITHM, SECRET_KEY, iv);
        let encrypted = cipher.update(text, 'utf8', 'hex');
        encrypted += cipher.final('hex');
        const authTag = cipher.getAuthTag().toString('hex');
        // Format: iv:authTag:encryptedText
        return `${iv.toString('hex')}:${authTag}:${encrypted}`;
    } catch (error) {
        console.error('[Crypto] Encryption error:', error);
        return text; // Return plain text if encryption fails
    }
}

/**
 * Decrypts an encrypted text back to plain string
 */
function decryptText(encryptedText) {
    if (!encryptedText || !encryptedText.includes(':')) return encryptedText; // Probably plain text legacy
    try {
        const parts = encryptedText.split(':');
        if (parts.length !== 3) return encryptedText;

        const iv = Buffer.from(parts[0], 'hex');
        const authTag = Buffer.from(parts[1], 'hex');
        const encrypted = parts[2];

        const decipher = crypto.createDecipheriv(ALGORITHM, SECRET_KEY, iv);
        decipher.setAuthTag(authTag);

        let decrypted = decipher.update(encrypted, 'hex', 'utf8');
        decrypted += decipher.final('utf8');
        return decrypted;
    } catch (error) {
        console.error('[Crypto] Decryption error:', error);
        return 'Tin nhắn không thể giải mã.';
    }
}

module.exports = {
    encryptText,
    decryptText
};
