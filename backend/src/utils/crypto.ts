import crypto from 'node:crypto';
import { Env } from '../index';

const ALGORITHM = 'aes-256-gcm';

function getSecretKey(env: Env) {
  // @ts-ignore - CHAT_ENCRYPTION_KEY might be defined in Env dynamically
  const key = (env as any).CHAT_ENCRYPTION_KEY || 'vufamily_default_secret_key_1234';
  return Buffer.from(key.padEnd(32, '0').slice(0, 32));
}

export function encryptText(text: string, env: Env): string {
  if (!text) return text;
  try {
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv(ALGORITHM, getSecretKey(env), iv);
    let encrypted = cipher.update(text, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    const authTag = cipher.getAuthTag().toString('hex');
    return `${iv.toString('hex')}:${authTag}:${encrypted}`;
  } catch (error) {
    console.error('[Crypto] Encryption error:', error);
    return text;
  }
}

export function decryptText(encryptedText: string, env: Env): string {
  if (!encryptedText || !encryptedText.includes(':')) return encryptedText;
  try {
    const parts = encryptedText.split(':');
    if (parts.length !== 3) return encryptedText;

    const iv = Buffer.from(parts[0], 'hex');
    const authTag = Buffer.from(parts[1], 'hex');
    const encrypted = parts[2];

    const decipher = crypto.createDecipheriv(ALGORITHM, getSecretKey(env), iv);
    decipher.setAuthTag(authTag);

    let decrypted = decipher.update(encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    return decrypted;
  } catch (error) {
    // Try fallback decryption using legacy default key
    try {
      const parts = encryptedText.split(':');
      const iv = Buffer.from(parts[0], 'hex');
      const authTag = Buffer.from(parts[1], 'hex');
      const encrypted = parts[2];
      const fallbackKey = Buffer.from('vufamily_default_secret_key_1234'.padEnd(32, '0').slice(0, 32));

      const decipher = crypto.createDecipheriv(ALGORITHM, fallbackKey, iv);
      decipher.setAuthTag(authTag);

      let decrypted = decipher.update(encrypted, 'hex', 'utf8');
      decrypted += decipher.final('utf8');
      return decrypted;
    } catch (fallbackError) {
      console.error('[Crypto] Decryption error:', error);
      return 'Lỗi giải mã';
    }
  }
}
