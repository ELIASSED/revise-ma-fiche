import crypto from 'node:crypto';

const ALGORITHM = 'aes-256-gcm';
const KEY_LENGTH = 32;
const IV_LENGTH = 16;
const TAG_LENGTH = 16;

// Clé d'encryption dérivée des variables d'environnement
function getEncryptionKey(): Buffer {
  const secret = process.env.ENCRYPTION_SECRET;
  if (!secret) {
    // Utiliser une clé par défaut pour le développement
    console.warn('ENCRYPTION_SECRET not found, using default key for development');
    return crypto.scryptSync('default-dev-key-change-in-production', 'salt', KEY_LENGTH);
  }
  return crypto.scryptSync(secret, 'salt', KEY_LENGTH);
}

export interface EncryptedData {
  encrypted: Buffer;
  iv: Buffer;
  tag: Buffer;
}

export function encryptBuffer(data: Buffer): EncryptedData {
  const key = getEncryptionKey();
  const iv = crypto.randomBytes(IV_LENGTH);
  
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
  cipher.setAAD(Buffer.from('payroll-file'));
  
  const encrypted = Buffer.concat([
    cipher.update(data),
    cipher.final()
  ]);
  
  const tag = cipher.getAuthTag();
  
  return {
    encrypted,
    iv,
    tag
  };
}

export function decryptBuffer(encryptedData: EncryptedData): Buffer {
  const key = getEncryptionKey();
  
  const decipher = crypto.createDecipheriv(ALGORITHM, key, encryptedData.iv);
  decipher.setAAD(Buffer.from('payroll-file'));
  decipher.setAuthTag(encryptedData.tag);
  
  const decrypted = Buffer.concat([
    decipher.update(encryptedData.encrypted),
    decipher.final()
  ]);
  
  return decrypted;
}

export async function encryptFile(buffer: Buffer): Promise<Buffer> {
  const { encrypted, iv, tag } = encryptBuffer(buffer);
  
  // Combiner IV + tag + encrypted data
  const combined = Buffer.concat([iv, tag, encrypted]);
  return combined;
}

export async function decryptFile(encryptedBuffer: Buffer): Promise<Buffer> {
  // Extraire IV, tag et encrypted data
  const iv = encryptedBuffer.subarray(0, IV_LENGTH);
  const tag = encryptedBuffer.subarray(IV_LENGTH, IV_LENGTH + TAG_LENGTH);
  const encrypted = encryptedBuffer.subarray(IV_LENGTH + TAG_LENGTH);
  
  return decryptBuffer({ encrypted, iv, tag });
}

// Générer une clé secrète aléatoire pour l'environnement
export function generateEncryptionSecret(): string {
  return crypto.randomBytes(64).toString('hex');
}
