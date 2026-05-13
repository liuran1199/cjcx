const crypto = require('crypto');

const SECRET = process.env.ENCRYPTION_KEY;
if (!SECRET) {
  console.error('FATAL: ENCRYPTION_KEY environment variable is required');
  process.exit(1);
}
// Derive key with unique per-deployment salt
const KEY = crypto.scryptSync(SECRET, 'cjcx-v1', 32);

const ALGORITHM_GCM = 'aes-256-gcm';
const ALGORITHM_CBC = 'aes-256-cbc';
const IV_LENGTH_GCM = 12;
const IV_LENGTH_CBC = 16;
const TAG_LENGTH = 16;

function encrypt(text) {
  if (!text) return '';
  const iv = crypto.randomBytes(IV_LENGTH_GCM);
  const cipher = crypto.createCipheriv(ALGORITHM_GCM, KEY, iv);
  const encrypted = Buffer.concat([cipher.update(text, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return 'gcm:' + iv.toString('hex') + ':' + tag.toString('hex') + ':' + encrypted.toString('hex');
}

function decrypt(text) {
  if (!text) return '';
  try {
    const parts = text.split(':');

    // GCM format: gcm:iv:tag:encrypted
    if (parts[0] === 'gcm') {
      const iv = Buffer.from(parts[1], 'hex');
      const tag = Buffer.from(parts[2], 'hex');
      const encrypted = Buffer.from(parts[3], 'hex');
      const decipher = crypto.createDecipheriv(ALGORITHM_GCM, KEY, iv);
      decipher.setAuthTag(tag);
      return Buffer.concat([decipher.update(encrypted), decipher.final()]).toString('utf8');
    }

    // Legacy CBC format: iv:encrypted
    const iv = Buffer.from(parts[0], 'hex');
    const encrypted = Buffer.from(parts[1], 'hex');
    const decipher = crypto.createDecipheriv(ALGORITHM_CBC, KEY, iv);
    return Buffer.concat([decipher.update(encrypted), decipher.final()]).toString('utf8');
  } catch {
    return ''; // Corrupted or malformed data
  }
}

function maskIdCard(idCard) {
  if (!idCard || idCard.length < 8) return idCard;
  return idCard.slice(0, 4) + '****' + idCard.slice(-4);
}

module.exports = { encrypt, decrypt, maskIdCard };
