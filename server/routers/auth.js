const express = require('express');
const jwt = require('jsonwebtoken');
const axios = require('axios');
const { getDb } = require('../database');
const { authenticateToken, requireAdmin, JWT_SECRET } = require('../middleware/auth');

const router = express.Router();

function getCasConfig() {
  const db = getDb();
  return db.prepare('SELECT * FROM cas_config WHERE id = 1').get();
}

// GET  /api/auth/cas/config   —  get CAS config (public)
router.get('/cas/config', (req, res) => {
  const config = getCasConfig();
  res.json({
    enabled: !!config.enabled,
    cas_url: config.cas_url || '',
    service_url: config.service_url || ''
  });
});

// PUT  /api/auth/cas/config   —  update CAS config (admin)
router.put('/cas/config', authenticateToken, requireAdmin, (req, res) => {
  const { enabled, cas_url, service_url } = req.body;
  const db = getDb();
  db.prepare('UPDATE cas_config SET enabled=?, cas_url=?, service_url=? WHERE id=1')
    .run(enabled ? 1 : 0, cas_url || '', service_url || '');
  res.json({ message: 'CAS配置更新成功' });
});

// GET  /api/auth/cas/login    —  generate CAS login URL
router.get('/cas/login', (req, res) => {
  const config = getCasConfig();
  if (!config.enabled || !config.cas_url) {
    return res.status(400).json({ error: 'CAS未启用' });
  }
  const serviceUrl = encodeURIComponent((config.service_url || '') + '/api/auth/cas/callback');
  const loginUrl = `${config.cas_url}/login?service=${serviceUrl}`;
  res.json({ loginUrl });
});

// GET  /api/auth/cas/callback —  CAS ticket callback, validate and issue JWT
router.get('/cas/callback', async (req, res) => {
  const { ticket } = req.query;
  const config = getCasConfig();
  const baseUrl = config.service_url || 'http://localhost:5173';

  if (!ticket) {
    return res.redirect(baseUrl + '/login?error=no_ticket');
  }

  try {
    const serviceUrl = encodeURIComponent((config.service_url || '') + '/api/auth/cas/callback');
    const validateUrl = `${config.cas_url}/serviceValidate?ticket=${ticket}&service=${serviceUrl}`;
    const response = await axios.get(validateUrl);
    const text = response.data;

    const pattern = /<cas:user>(.*?)<\/cas:user>|<sso:user>(.*?)<\/sso:user>/;
    const match = text.match(pattern);
    if (!match) {
      return res.redirect(baseUrl + '/login?error=invalid_ticket');
    }

    const username = match[1] || match[2];

    const db = getDb();
    let admin = db.prepare('SELECT * FROM admins WHERE employee_id = ?').get(username);

    if (!admin) {
      db.prepare('INSERT INTO admins (employee_id, password, name, role, auth_type) VALUES (?,?,?,?,?)')
        .run(username, '', username, 'user', 'cas');
      admin = db.prepare('SELECT * FROM admins WHERE employee_id = ?').get(username);
    }

    const token = jwt.sign(
      { id: admin.id, employee_id: admin.employee_id, name: admin.name, role: admin.role, auth_type: 'cas' },
      JWT_SECRET,
      { expiresIn: '24h' }
    );

    res.redirect(baseUrl + `/login?ticket_token=${token}`);
  } catch (err) {
    console.error('CAS验证失败:', err.message);
    res.redirect(baseUrl + '/login?error=validation_failed');
  }
});

// GET  /api/auth/cas/logout   —  CAS logout
router.get('/cas/logout', (req, res) => {
  const config = getCasConfig();
  const serviceUrl = encodeURIComponent((config.service_url || '') + '/login');
  const logoutUrl = config.enabled && config.cas_url
    ? `${config.cas_url}/logout?service=${serviceUrl}`
    : '/login';
  res.json({ logoutUrl });
});

// GET  /api/auth/me           —  get current user
router.get('/me', authenticateToken, (req, res) => {
  res.json(req.user);
});

module.exports = router;
