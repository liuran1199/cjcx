const jwt = require('jsonwebtoken');
const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) {
  console.error('FATAL: JWT_SECRET environment variable is required');
  process.exit(1);
}

function extractToken(req) {
  // Cookie first (HttpOnly, secure), then Authorization header (API compatibility)
  if (req.cookies && req.cookies.token) {
    return req.cookies.token;
  }
  const authHeader = req.headers['authorization'];
  if (authHeader && authHeader.startsWith('Bearer ')) {
    return authHeader.split(' ')[1];
  }
  return null;
}

function authenticateToken(req, res, next) {
  const token = extractToken(req);

  if (!token) {
    return res.status(401).json({ error: '请先登录' });
  }

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) {
      return res.status(403).json({ error: '登录已过期' });
    }
    req.user = user;
    next();
  });
}

function requireAdmin(req, res, next) {
  if (!req.user || (req.user.role !== 'admin' && req.user.role !== 'superadmin')) {
    return res.status(403).json({ error: '需要管理员权限' });
  }
  next();
}

function requireSuperAdmin(req, res, next) {
  if (!req.user || req.user.role !== 'superadmin') {
    return res.status(403).json({ error: '需要超级管理员权限' });
  }
  next();
}

module.exports = { authenticateToken, requireAdmin, requireSuperAdmin };
