const crypto = require('crypto');

const ALGORITHM = 'aes-256-cbc';
const SECRET = process.env.ENCRYPTION_KEY;
if (!SECRET) {
  console.error('FATAL: ENCRYPTION_KEY environment variable is required');
  process.exit(1);
}
const KEY = crypto.scryptSync(SECRET, 'salt', 32);
const IV_LENGTH = 16;

function encrypt(text) {
  if (!text) return '';
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGORITHM, KEY, iv);
  const encrypted = Buffer.concat([cipher.update(text, 'utf8'), cipher.final()]);
  return iv.toString('hex') + ':' + encrypted.toString('hex');
}

function decrypt(text) {
  if (!text) return '';
  const parts = text.split(':');
  const iv = Buffer.from(parts[0], 'hex');
  const encrypted = Buffer.from(parts[1], 'hex');
  const decipher = crypto.createDecipheriv(ALGORITHM, KEY, iv);
  return Buffer.concat([decipher.update(encrypted), decipher.final()]).toString('utf8');
}

function maskIdCard(idCard) {
  if (!idCard || idCard.length < 8) return idCard;
  return idCard.slice(0, 4) + '****' + idCard.slice(-4);
}

module.exports = { encrypt, decrypt, maskIdCard };
