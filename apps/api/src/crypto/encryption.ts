import crypto from 'node:crypto';

function getKeyFromEnv(appEncryptionKey: string): Buffer {
  // Accept either base64-encoded 32 bytes OR a raw passphrase (hashed to 32 bytes).
  try {
    const raw = Buffer.from(appEncryptionKey, 'base64');
    if (raw.length === 32) return raw;
  } catch {
    // ignore
  }
  return crypto.createHash('sha256').update(appEncryptionKey, 'utf8').digest();
}

export type EncryptedBlob = {
  v: 1;
  alg: 'aes-256-gcm';
  ivB64: string;
  tagB64: string;
  ctB64: string;
};

export function encryptString(plainText: string, appEncryptionKey: string): string {
  const key = getKeyFromEnv(appEncryptionKey);
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
  const ct = Buffer.concat([cipher.update(plainText, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();

  const blob: EncryptedBlob = {
    v: 1,
    alg: 'aes-256-gcm',
    ivB64: iv.toString('base64'),
    tagB64: tag.toString('base64'),
    ctB64: ct.toString('base64')
  };

  return JSON.stringify(blob);
}

export function decryptString(cipherText: string, appEncryptionKey: string): string {
  const key = getKeyFromEnv(appEncryptionKey);
  const blob = JSON.parse(cipherText) as EncryptedBlob;
  if (blob?.v !== 1 || blob?.alg !== 'aes-256-gcm') {
    throw new Error('Unsupported encrypted blob');
  }

  const iv = Buffer.from(blob.ivB64, 'base64');
  const tag = Buffer.from(blob.tagB64, 'base64');
  const ct = Buffer.from(blob.ctB64, 'base64');

  const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv);
  decipher.setAuthTag(tag);

  const pt = Buffer.concat([decipher.update(ct), decipher.final()]);
  return pt.toString('utf8');
}
