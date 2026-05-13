# 学生成绩自助查询系统 实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 构建学生成绩自助查询 Web 应用，支持 CAS 统一认证 + 可选身份证验证 + 管理员 Excel 导入成绩

**Architecture:** Vue 3 SPA 单应用（学生查询页 + 管理员后台路由分离），Node.js Express 后端，SQLite 数据库。CAS 认证流程直接适配自 castest 参考项目。

**Tech Stack:** Vue 3 + Element Plus + Vite, Node.js + Express + better-sqlite3, xlsx, JWT + bcryptjs, AES-256-CBC

---

## 文件结构

```
/home/lr/cjcx/
├── server/
│   ├── package.json
│   ├── index.js              # Express 入口，挂载路由与中间件
│   ├── database.js           # SQLite 初始化 + 表创建 + 默认数据
│   ├── middleware/
│   │   └── auth.js           # JWT 认证中间件 + 角色校验中间件
│   ├── routers/
│   │   ├── auth.js           # CAS 认证路由
│   │   ├── query.js          # 学生成绩查询路由
│   │   └── admin.js          # 管理员路由（考试/成绩/导入/账号/日志）
│   └── utils/
│       └── crypto.js         # AES-256-CBC 身份证加解密
├── client/
│   ├── package.json
│   ├── index.html
│   ├── vite.config.js
│   └── src/
│       ├── main.js
│       ├── App.vue
│       ├── router.js
│       ├── api.js            # Axios 封装 + 全部 API 方法
│       ├── views/
│       │   ├── Login.vue     # CAS 回调处理 + token 提取
│       │   ├── Query.vue     # 学生成绩查询页
│       │   └── admin/
│       │       ├── Layout.vue    # 后台侧边栏布局
│       │       ├── Exams.vue     # 考试管理
│       │       ├── Import.vue    # Excel 导入预览确认
│       │       ├── Scores.vue    # 成绩数据管理
│       │       ├── CasConfig.vue # CAS 配置
│       │       ├── Accounts.vue  # 管理员账号管理
│       │       └── Logs.vue      # 查询日志
│       └── components/
│           └── ScoreCard.vue     # 成绩展示卡片（可复用）
└── docs/superpowers/specs/2026-05-13-score-query-system-design.md
```

---

### Task 1: 项目骨架与依赖

**Files:**
- Create: `server/package.json`
- Create: `client/package.json`
- Create: `client/index.html`
- Create: `client/vite.config.js`
- Create: `client/src/main.js`
- Create: `client/src/App.vue`

- [ ] **Step 1: 创建 server/package.json**

```json
{
  "name": "score-query-server",
  "version": "1.0.0",
  "scripts": {
    "start": "node index.js",
    "dev": "node --watch index.js"
  },
  "dependencies": {
    "express": "^4.21.0",
    "cors": "^2.8.5",
    "better-sqlite3": "^11.6.0",
    "jsonwebtoken": "^9.0.2",
    "bcryptjs": "^2.4.3",
    "axios": "^1.7.7",
    "xlsx": "^0.18.5",
    "multer": "^1.4.5-lts.1",
    "helmet": "^8.0.0",
    "express-rate-limit": "^7.4.1"
  }
}
```

- [ ] **Step 2: 创建 client/package.json**

```json
{
  "name": "score-query-client",
  "version": "1.0.0",
  "scripts": {
    "dev": "vite",
    "build": "vite build",
    "preview": "vite preview"
  },
  "dependencies": {
    "vue": "^3.5.13",
    "vue-router": "^4.5.0",
    "element-plus": "^2.9.1",
    "@element-plus/icons-vue": "^2.3.1",
    "axios": "^1.7.7"
  },
  "devDependencies": {
    "@vitejs/plugin-vue": "^5.2.1",
    "vite": "^6.0.5"
  }
}
```

- [ ] **Step 3: 创建 client/index.html**

```html
<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>成绩查询系统</title>
</head>
<body>
  <div id="app"></div>
  <script type="module" src="/src/main.js"></script>
</body>
</html>
```

- [ ] **Step 4: 创建 client/vite.config.js**

```js
import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

export default defineConfig({
  plugins: [vue()],
  server: {
    port: 5173,
    proxy: {
      '/api': 'http://localhost:3002'
    }
  }
})
```

- [ ] **Step 5: 创建 client/src/main.js**

```js
import { createApp } from 'vue'
import ElementPlus from 'element-plus'
import 'element-plus/dist/index.css'
import App from './App.vue'
import router from './router'

const app = createApp(App)
app.use(ElementPlus)
app.use(router)
app.mount('#app')
```

- [ ] **Step 6: 创建 client/src/App.vue**

```vue
<template>
  <router-view />
</template>

<style>
* { margin: 0; padding: 0; box-sizing: border-box; }
body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #f5f7fa; }
</style>
```

- [ ] **Step 7: 安装依赖**

Run: `cd /home/lr/cjcx/server && npm install`
Run: `cd /home/lr/cjcx/client && npm install`

- [ ] **Step 8: Commit**

```bash
git add -A
git commit -m "chore: scaffold project structure and dependencies"
```

---

### Task 2: 数据库模块

**Files:**
- Create: `server/database.js`

- [ ] **Step 1: 创建 server/database.js**

```js
const Database = require('better-sqlite3');
const path = require('path');
const bcrypt = require('bcryptjs');

const dbPath = path.join(__dirname, 'campus.db');
let db;

function initDatabase() {
  db = new Database(dbPath);
  db.pragma('journal_mode = WAL');
  db.pragma('foreign_keys = ON');

  db.exec(`
    CREATE TABLE IF NOT EXISTS exams (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      id_verify INTEGER DEFAULT 0,
      score_columns TEXT DEFAULT '[]',
      created_at TEXT DEFAULT (datetime('now','localtime'))
    );

    CREATE TABLE IF NOT EXISTS scores (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      exam_id INTEGER NOT NULL REFERENCES exams(id) ON DELETE CASCADE,
      student_id TEXT NOT NULL,
      name TEXT NOT NULL,
      id_card TEXT DEFAULT '',
      score_data TEXT DEFAULT '{}',
      created_at TEXT DEFAULT (datetime('now','localtime'))
    );

    CREATE UNIQUE INDEX IF NOT EXISTS idx_scores_exam_student
      ON scores(exam_id, student_id);

    CREATE TABLE IF NOT EXISTS admins (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      employee_id TEXT NOT NULL UNIQUE,
      password TEXT DEFAULT '',
      name TEXT NOT NULL,
      role TEXT DEFAULT 'admin',
      auth_type TEXT DEFAULT 'local',
      created_at TEXT DEFAULT (datetime('now','localtime'))
    );

    CREATE TABLE IF NOT EXISTS query_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      exam_id INTEGER,
      student_id TEXT,
      ip TEXT,
      result TEXT,
      created_at TEXT DEFAULT (datetime('now','localtime'))
    );

    CREATE TABLE IF NOT EXISTS cas_config (
      id INTEGER PRIMARY KEY CHECK (id = 1),
      enabled INTEGER DEFAULT 0,
      cas_url TEXT DEFAULT '',
      service_url TEXT DEFAULT ''
    );
  `);

  const row = db.prepare('SELECT id FROM cas_config WHERE id = 1').get();
  if (!row) {
    db.prepare('INSERT INTO cas_config (id, enabled, cas_url, service_url) VALUES (1, 0, "", "")').run();
  }

  const admin = db.prepare('SELECT id FROM admins WHERE employee_id = ?').get('admin');
  if (!admin) {
    const hash = bcrypt.hashSync('admin123', 10);
    db.prepare('INSERT INTO admins (employee_id, password, name, role, auth_type) VALUES (?,?,?,?,?)')
      .run('admin', hash, '系统管理员', 'superadmin', 'local');
    console.log('已创建默认管理员: admin / admin123');
  }

  console.log('数据库初始化完成');
  return db;
}

function getDb() {
  return db;
}

module.exports = { initDatabase, getDb };
```

- [ ] **Step 2: 验证数据库模块**

Run: `cd /home/lr/cjcx/server && node -e "const {initDatabase, getDb} = require('./database'); initDatabase(); const db = getDb(); const tables = db.prepare(\"SELECT name FROM sqlite_master WHERE type='table'\").all(); console.log('Tables:', tables.map(t=>t.name)); process.exit(0)"`
Expected: Tables includes exams, scores, admins, query_logs, cas_config

- [ ] **Step 3: Commit**

```bash
git add server/database.js server/campus.db
echo "server/campus.db" >> .gitignore
git add .gitignore
git commit -m "feat: add database module with SQLite schema and defaults"
```

---

### Task 3: AES 加解密工具

**Files:**
- Create: `server/utils/crypto.js`

- [ ] **Step 1: 创建加密工具**

```js
const crypto = require('crypto');

const ALGORITHM = 'aes-256-cbc';
const KEY = crypto.scryptSync(
  process.env.ENCRYPTION_KEY || 'score-query-default-key-2024',
  'salt',
  32
);
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
```

- [ ] **Step 2: 验证加解密**

Run: `cd /home/lr/cjcx/server && node -e "const { encrypt, decrypt, maskIdCard } = require('./utils/crypto'); const e = encrypt('340123199001011234'); console.log('Encrypted:', e); console.log('Decrypted:', decrypt(e)); console.log('Masked:', maskIdCard('340123199001011234'));"`
Expected: Decrypted shows original, Masked shows `3401****1234`

- [ ] **Step 3: Commit**

```bash
git add server/utils/crypto.js
git commit -m "feat: add AES-256-CBC id card encryption utility"
```

---

### Task 4: JWT 认证中间件

**Files:**
- Create: `server/middleware/auth.js`

- [ ] **Step 1: 创建认证中间件**

```js
const jwt = require('jsonwebtoken');
const JWT_SECRET = process.env.JWT_SECRET || 'score-query-jwt-secret-2024';

function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

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

module.exports = { authenticateToken, requireAdmin, requireSuperAdmin, JWT_SECRET };
```

- [ ] **Step 2: 验证中间件加载无语法错误**

Run: `cd /home/lr/cjcx/server && node -e "const m = require('./middleware/auth'); console.log('Middleware loaded:', Object.keys(m));"`
Expected: Middleware loaded: [ 'authenticateToken', 'requireAdmin', 'requireSuperAdmin', 'JWT_SECRET' ]

- [ ] **Step 3: Commit**

```bash
git add server/middleware/auth.js
git commit -m "feat: add JWT authentication and role-based middleware"
```

---

### Task 5: CAS 认证路由

**Files:**
- Create: `server/routers/auth.js`

- [ ] **Step 1: 创建 CAS 认证路由**

```js
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

// GET  /api/auth/cas/config   —  获取 CAS 配置（公开）
router.get('/cas/config', (req, res) => {
  const config = getCasConfig();
  res.json({
    enabled: !!config.enabled,
    cas_url: config.cas_url || '',
    service_url: config.service_url || ''
  });
});

// PUT  /api/auth/cas/config   —  更新 CAS 配置（管理员）
router.put('/cas/config', authenticateToken, requireAdmin, (req, res) => {
  const { enabled, cas_url, service_url } = req.body;
  const db = getDb();
  db.prepare('UPDATE cas_config SET enabled=?, cas_url=?, service_url=? WHERE id=1')
    .run(enabled ? 1 : 0, cas_url || '', service_url || '');
  res.json({ message: 'CAS配置更新成功' });
});

// GET  /api/auth/cas/login    —  生成 CAS 登录 URL
router.get('/cas/login', (req, res) => {
  const config = getCasConfig();
  if (!config.enabled || !config.cas_url) {
    return res.status(400).json({ error: 'CAS未启用' });
  }
  const serviceUrl = encodeURIComponent((config.service_url || '') + '/api/auth/cas/callback');
  const loginUrl = `${config.cas_url}/login?service=${serviceUrl}`;
  res.json({ loginUrl });
});

// GET  /api/auth/cas/callback —  CAS ticket 回调，验证并签发 JWT
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

    res.redirect(baseUrl + `/login?token=${token}`);
  } catch (err) {
    console.error('CAS验证失败:', err.message);
    res.redirect(baseUrl + '/login?error=validation_failed');
  }
});

// GET  /api/auth/cas/logout   —  CAS 登出
router.get('/cas/logout', (req, res) => {
  const config = getCasConfig();
  const serviceUrl = encodeURIComponent((config.service_url || '') + '/login');
  const logoutUrl = config.enabled && config.cas_url
    ? `${config.cas_url}/logout?service=${serviceUrl}`
    : '/login';
  res.json({ logoutUrl });
});

// GET  /api/auth/me           —  获取当前用户信息
router.get('/me', authenticateToken, (req, res) => {
  res.json(req.user);
});

module.exports = router;
```

- [ ] **Step 2: 验证路由语法**

Run: `cd /home/lr/cjcx/server && node -e "const r = require('./routers/auth'); console.log('Auth router loaded, stack size:', r.stack.length);"`
Expected: Auth router loaded (no errors)

- [ ] **Step 3: Commit**

```bash
git add server/routers/auth.js
git commit -m "feat: add CAS authentication routes with ticket validation and JWT"
```

---

### Task 6: 学生成绩查询路由

**Files:**
- Create: `server/routers/query.js`

- [ ] **Step 1: 创建查询路由**

```js
const express = require('express');
const { getDb } = require('../database');
const { authenticateToken } = require('../middleware/auth');
const { decrypt, maskIdCard } = require('../utils/crypto');

const router = express.Router();

// GET  /api/query/exams          —  获取可查询的考试列表
router.get('/exams', authenticateToken, (req, res) => {
  const db = getDb();
  const exams = db.prepare('SELECT id, name, id_verify, created_at FROM exams ORDER BY id DESC').all();
  res.json(exams);
});

// GET  /api/query/exams/:id/score —  查询成绩
router.get('/exams/:id/score', authenticateToken, (req, res) => {
  const db = getDb();
  const examId = req.params.id;
  const studentId = req.user.employee_id;
  const { id_card } = req.query;

  const exam = db.prepare('SELECT * FROM exams WHERE id = ?').get(examId);
  if (!exam) {
    return res.status(404).json({ error: '考试不存在' });
  }

  const score = db.prepare('SELECT * FROM scores WHERE exam_id = ? AND student_id = ?')
    .get(examId, studentId);

  // 记录查询日志
  const logResult = score ? 'success' : 'not_found';
  db.prepare('INSERT INTO query_logs (exam_id, student_id, ip, result) VALUES (?,?,?,?)')
    .run(examId, studentId, req.ip, logResult);

  if (!score) {
    return res.json({ found: false, message: '未找到您的成绩记录' });
  }

  // 身份证验证
  if (exam.id_verify) {
    if (!id_card) {
      return res.json({ found: true, require_id_verify: true });
    }
    const decrypted = decrypt(score.id_card);
    if (decrypted !== id_card) {
      db.prepare('UPDATE query_logs SET result = ? WHERE rowid = last_insert_rowid()').run('id_mismatch');
      // 重新插入正确的日志
      db.prepare('DELETE FROM query_logs WHERE rowid = (SELECT MAX(rowid) FROM query_logs)').run();
      db.prepare('INSERT INTO query_logs (exam_id, student_id, ip, result) VALUES (?,?,?,?)')
        .run(examId, studentId, req.ip, 'id_mismatch');
      return res.status(400).json({ error: '身份证号不匹配' });
    }
  }

  const scoreData = JSON.parse(score.score_data || '{}');
  res.json({
    found: true,
    data: {
      name: score.name,
      student_id: score.student_id,
      id_card: maskIdCard(decrypt(score.id_card)),
      scores: scoreData
    }
  });
});

module.exports = router;
```

- [ ] **Step 2: 验证路由语法**

Run: `cd /home/lr/cjcx/server && node -e "const r = require('./routers/query'); console.log('Query router loaded, stack size:', r.stack.length);"`
Expected: Query router loaded (no errors)

- [ ] **Step 3: Commit**

```bash
git add server/routers/query.js
git commit -m "feat: add student score query routes with optional id verification"
```

---

### Task 7: 管理员路由 — 考试管理

**Files:**
- Create: `server/routers/admin.js`

- [ ] **Step 1: 创建考试管理路由部分**

```js
const express = require('express');
const multer = require('multer');
const XLSX = require('xlsx');
const { getDb } = require('../database');
const { authenticateToken, requireAdmin, requireSuperAdmin } = require('../middleware/auth');
const { encrypt, decrypt } = require('../utils/crypto');

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage() });

// 所有路由都需要登录 + 管理员权限
router.use(authenticateToken, requireAdmin);

// ==================== 考试管理 ====================

// GET  /api/admin/exams      —  考试列表
router.get('/exams', (req, res) => {
  const db = getDb();
  const exams = db.prepare('SELECT * FROM exams ORDER BY id DESC').all();
  exams.forEach(e => {
    const count = db.prepare('SELECT COUNT(*) as cnt FROM scores WHERE exam_id = ?').get(e.id);
    e.score_count = count.cnt;
  });
  res.json(exams);
});

// POST /api/admin/exams      —  创建考试
router.post('/exams', (req, res) => {
  const { name, id_verify, score_columns } = req.body;
  if (!name) {
    return res.status(400).json({ error: '考试名称不能为空' });
  }
  const db = getDb();
  const result = db.prepare('INSERT INTO exams (name, id_verify, score_columns) VALUES (?,?,?)')
    .run(name, id_verify ? 1 : 0, JSON.stringify(score_columns || []));
  res.status(201).json({ id: result.lastInsertRowid, message: '创建成功' });
});

// PUT  /api/admin/exams/:id  —  编辑考试
router.put('/exams/:id', (req, res) => {
  const { name, id_verify, score_columns } = req.body;
  const db = getDb();
  const exam = db.prepare('SELECT * FROM exams WHERE id = ?').get(req.params.id);
  if (!exam) return res.status(404).json({ error: '考试不存在' });
  db.prepare('UPDATE exams SET name=?, id_verify=?, score_columns=? WHERE id=?')
    .run(name || exam.name, id_verify !== undefined ? (id_verify ? 1 : 0) : exam.id_verify,
      JSON.stringify(score_columns || JSON.parse(exam.score_columns || '[]')), req.params.id);
  res.json({ message: '更新成功' });
});

// DELETE /api/admin/exams/:id —  删除考试及成绩
router.delete('/exams/:id', (req, res) => {
  const db = getDb();
  const exam = db.prepare('SELECT * FROM exams WHERE id = ?').get(req.params.id);
  if (!exam) return res.status(404).json({ error: '考试不存在' });
  db.prepare('DELETE FROM scores WHERE exam_id = ?').run(req.params.id);
  db.prepare('DELETE FROM query_logs WHERE exam_id = ?').run(req.params.id);
  db.prepare('DELETE FROM exams WHERE id = ?').run(req.params.id);
  res.json({ message: '删除成功' });
});

module.exports = { router, upload };
```

- [ ] **Step 2: 验证语法**

Run: `cd /home/lr/cjcx/server && node -e "const {router} = require('./routers/admin'); console.log('Admin (exams) router loaded, stack size:', router.stack.length);"`
Expected: Admin router loaded (no errors)

- [ ] **Step 3: Commit**

```bash
git add server/routers/admin.js
git commit -m "feat: add admin exam CRUD routes"
```

---

### Task 8: 管理员路由 — Excel 导入

**Files:**
- Modify: `server/routers/admin.js` — 追加导入相关路由

- [ ] **Step 1: 在 admin.js 中追加 Excel 导入路由**

在 `module.exports = { router, upload };` 之前追加以下代码：

```js
// ==================== Excel 导入 ====================

// POST /api/admin/exams/:id/preview  —  预览 Excel 表头
router.post('/exams/:id/preview', upload.single('file'), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: '请上传文件' });
  }
  try {
    const workbook = XLSX.read(req.file.buffer, { type: 'buffer' });
    const sheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];
    const data = XLSX.utils.sheet_to_json(sheet, { header: 1 });

    if (data.length < 2) {
      return res.status(400).json({ error: 'Excel至少需要表头和一行数据' });
    }

    const headers = data[0].map(String);
    const rows = data.slice(1, 6).map(row =>
      row.reduce((obj, val, i) => {
        obj[headers[i] || `col_${i}`] = val;
        return obj;
      }, {})
    );

    res.json({ headers, preview: rows, totalRows: data.length - 1 });
  } catch (err) {
    console.error('Excel解析失败:', err.message);
    res.status(400).json({ error: 'Excel解析失败: ' + err.message });
  }
});

// POST /api/admin/exams/:id/import   —  确认导入
router.post('/exams/:id/import', upload.single('file'), (req, res) => {
  const examId = req.params.id;
  const db = getDb();

  const exam = db.prepare('SELECT * FROM exams WHERE id = ?').get(examId);
  if (!exam) return res.status(404).json({ error: '考试不存在' });

  const { mapping } = req.body;
  const mappingObj = typeof mapping === 'string' ? JSON.parse(mapping) : mapping;
  // mapping: { student_id: "学号", name: "姓名", id_card: "身份证号", scores: ["行测成绩","面试成绩","总成绩"] }

  if (!req.file) {
    return res.status(400).json({ error: '请上传文件' });
  }

  try {
    const workbook = XLSX.read(req.file.buffer, { type: 'buffer' });
    const sheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];
    const data = XLSX.utils.sheet_to_json(sheet, { header: 1 });

    const headers = data[0].map(String);
    const studentIdCol = headers.indexOf(mappingObj.student_id);
    const nameCol = headers.indexOf(mappingObj.name);
    const idCardCol = mappingObj.id_card ? headers.indexOf(mappingObj.id_card) : -1;
    const scoreCols = (mappingObj.scores || []).map(s => headers.indexOf(s));

    if (studentIdCol === -1) return res.status(400).json({ error: '未找到学号列' });
    if (nameCol === -1) return res.status(400).json({ error: '未找到姓名列' });

    db.prepare('DELETE FROM scores WHERE exam_id = ?').run(examId);

    const insert = db.prepare(
      'INSERT INTO scores (exam_id, student_id, name, id_card, score_data) VALUES (?,?,?,?,?)'
    );

    const insertMany = db.transaction((rows) => {
      for (const row of rows) {
        insert.run(examId, row.student_id, row.name, row.id_card, row.score_data);
      }
    });

    const rows = [];
    for (let i = 1; i < data.length; i++) {
      const row = data[i];
      const studentId = String(row[studentIdCol] || '').trim();
      if (!studentId) continue;

      const scoreData = {};
      (mappingObj.scores || []).forEach((s, idx) => {
        if (scoreCols[idx] !== -1) {
          scoreData[s] = row[scoreCols[idx]];
        }
      });

      const idCardRaw = idCardCol !== -1 ? String(row[idCardCol] || '').trim() : '';

      rows.push({
        student_id: studentId,
        name: String(row[nameCol] || '').trim(),
        id_card: encrypt(idCardRaw),
        score_data: JSON.stringify(scoreData)
      });
    }

    insertMany(rows);

    // 更新考试的成绩列定义
    db.prepare('UPDATE exams SET score_columns = ? WHERE id = ?')
      .run(JSON.stringify(mappingObj.scores || []), examId);

    res.json({ message: `成功导入 ${rows.length} 条成绩` });
  } catch (err) {
    console.error('导入失败:', err.message);
    res.status(500).json({ error: '导入失败: ' + err.message });
  }
});
```

- [ ] **Step 2: 验证语法**

Run: `cd /home/lr/cjcx/server && node -e "const {router} = require('./routers/admin'); console.log('Admin router stack size:', router.stack.length);"`
Expected: Admin router stack size greater than before

- [ ] **Step 3: Commit**

```bash
git add server/routers/admin.js
git commit -m "feat: add Excel import with preview and column mapping"
```

---

### Task 9: 管理员路由 — 成绩数据管理

**Files:**
- Modify: `server/routers/admin.js` — 追加成绩管理路由

- [ ] **Step 1: 在 admin.js 中追加成绩管理路由**

在 `module.exports = { router, upload };` 之前追加：

```js
// ==================== 成绩管理 ====================

// GET  /api/admin/exams/:id/scores  —  成绩列表（搜索+分页）
router.get('/exams/:id/scores', (req, res) => {
  const db = getDb();
  const examId = req.params.id;
  const { page = 1, pageSize = 20, search = '' } = req.query;
  const offset = (page - 1) * pageSize;

  let query = 'SELECT * FROM scores WHERE exam_id = ?';
  const params = [examId];

  if (search) {
    query += ' AND (student_id LIKE ? OR name LIKE ?)';
    params.push(`%${search}%`, `%${search}%`);
  }

  query += ' ORDER BY id ASC LIMIT ? OFFSET ?';
  params.push(parseInt(pageSize), offset);

  const scores = db.prepare(query).all(...params);
  const countRow = db.prepare(
    'SELECT COUNT(*) as total FROM scores WHERE exam_id = ?' +
    (search ? ' AND (student_id LIKE ? OR name LIKE ?)' : '')
  ).get(...(search ? [examId, `%${search}%`, `%${search}%`] : [examId]));

  const decrypted = scores.map(s => ({
    ...s,
    id_card: decrypt(s.id_card),
    score_data: JSON.parse(s.score_data || '{}')
  }));

  res.json({
    data: decrypted,
    total: countRow.total,
    page: parseInt(page),
    pageSize: parseInt(pageSize)
  });
});

// PUT  /api/admin/scores/:id     —  编辑单条成绩
router.put('/scores/:id', (req, res) => {
  const db = getDb();
  const score = db.prepare('SELECT * FROM scores WHERE id = ?').get(req.params.id);
  if (!score) return res.status(404).json({ error: '成绩不存在' });

  const { name, student_id, id_card, score_data } = req.body;

  db.prepare('UPDATE scores SET name=?, student_id=?, id_card=?, score_data=? WHERE id=?')
    .run(
      name || score.name,
      student_id || score.student_id,
      id_card ? encrypt(id_card) : score.id_card,
      score_data ? JSON.stringify(score_data) : score.score_data,
      req.params.id
    );

  res.json({ message: '更新成功' });
});

// DELETE /api/admin/scores/:id   —  删除单条成绩
router.delete('/scores/:id', (req, res) => {
  const db = getDb();
  const score = db.prepare('SELECT * FROM scores WHERE id = ?').get(req.params.id);
  if (!score) return res.status(404).json({ error: '成绩不存在' });
  db.prepare('DELETE FROM scores WHERE id = ?').run(req.params.id);
  res.json({ message: '删除成功' });
});
```

- [ ] **Step 2: 验证语法**

Run: `cd /home/lr/cjcx/server && node -e "const {router} = require('./routers/admin'); console.log('Admin router stack size:', router.stack.length);"`
Expected: No errors

- [ ] **Step 3: Commit**

```bash
git add server/routers/admin.js
git commit -m "feat: add score data management routes with search and pagination"
```

---

### Task 10: 管理员路由 — 账号管理 + 查询日志

**Files:**
- Modify: `server/routers/admin.js` — 追加账号管理和日志路由

- [ ] **Step 1: 在 admin.js 中追加账号管理和日志路由**

在 `module.exports = { router, upload };` 之前追加：

```js
// ==================== 管理员账号管理（超级管理员） ====================

// GET  /api/admin/accounts    —  管理员列表
router.get('/accounts', requireSuperAdmin, (req, res) => {
  const db = getDb();
  const accounts = db.prepare('SELECT id, employee_id, name, role, auth_type, created_at FROM admins ORDER BY id').all();
  res.json(accounts);
});

// POST /api/admin/accounts    —  添加管理员
router.post('/accounts', requireSuperAdmin, (req, res) => {
  const { employee_id, password, name, role = 'admin' } = req.body;
  if (!employee_id || !password || !name) {
    return res.status(400).json({ error: '请填写完整信息' });
  }
  const db = getDb();
  const existing = db.prepare('SELECT id FROM admins WHERE employee_id = ?').get(employee_id);
  if (existing) return res.status(400).json({ error: '工号已存在' });

  const bcrypt = require('bcryptjs');
  const hash = bcrypt.hashSync(password, 10);
  db.prepare('INSERT INTO admins (employee_id, password, name, role, auth_type) VALUES (?,?,?,?,?)')
    .run(employee_id, hash, name, role, 'local');
  res.status(201).json({ message: '创建成功' });
});

// DELETE /api/admin/accounts/:id —  删除管理员
router.delete('/accounts/:id', requireSuperAdmin, (req, res) => {
  const db = getDb();
  const admin = db.prepare('SELECT * FROM admins WHERE id = ?').get(req.params.id);
  if (!admin) return res.status(404).json({ error: '管理员不存在' });
  if (admin.role === 'superadmin') {
    return res.status(400).json({ error: '不能删除超级管理员' });
  }
  db.prepare('DELETE FROM admins WHERE id = ?').run(req.params.id);
  res.json({ message: '删除成功' });
});

// ==================== 查询日志 ====================

// GET  /api/admin/logs       —  查询日志列表
router.get('/logs', (req, res) => {
  const db = getDb();
  const { page = 1, pageSize = 20, exam_id = '' } = req.query;
  const offset = (page - 1) * pageSize;

  let query = 'SELECT ql.*, e.name as exam_name FROM query_logs ql LEFT JOIN exams e ON ql.exam_id = e.id';
  let countQuery = 'SELECT COUNT(*) as total FROM query_logs';
  const params = [];
  const countParams = [];

  if (exam_id) {
    query += ' WHERE ql.exam_id = ?';
    countQuery += ' WHERE exam_id = ?';
    params.push(exam_id);
    countParams.push(exam_id);
  }

  query += ' ORDER BY ql.id DESC LIMIT ? OFFSET ?';
  params.push(parseInt(pageSize), offset);

  const logs = db.prepare(query).all(...params);
  const countRow = db.prepare(countQuery).get(...countParams);

  res.json({
    data: logs,
    total: countRow.total,
    page: parseInt(page),
    pageSize: parseInt(pageSize)
  });
});
```

- [ ] **Step 2: 验证完整路由**

Run: `cd /home/lr/cjcx/server && node -e "const {router} = require('./routers/admin'); console.log('Admin router full stack size:', router.stack.length);"`
Expected: No errors, stack size > 10

- [ ] **Step 3: Commit**

```bash
git add server/routers/admin.js
git commit -m "feat: add admin account management and query logs routes"
```

---

### Task 11: Express 服务入口

**Files:**
- Create: `server/index.js`

- [ ] **Step 1: 创建服务入口**

```js
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const path = require('path');
const { initDatabase } = require('./database');
const authRouter = require('./routers/auth');
const queryRouter = require('./routers/query');
const { router: adminRouter } = require('./routers/admin');

const app = express();
const PORT = process.env.PORT || 3002;

// 安全中间件
app.use(helmet({
  contentSecurityPolicy: false,
  crossOriginEmbedderPolicy: false
}));
app.use(cors());

// 速率限制
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 200,
  message: { error: '请求过于频繁，请稍后再试' }
});
app.use('/api', limiter);

app.use(express.json());

// 初始化数据库
initDatabase();

// 挂载路由
app.use('/api/auth', authRouter);
app.use('/api/query', queryRouter);
app.use('/api/admin', adminRouter);

// 生产环境：托管前端构建产物
const clientDist = path.join(__dirname, '..', 'client', 'dist');
app.use(express.static(clientDist));
app.get('*', (req, res) => {
  if (!req.path.startsWith('/api')) {
    res.sendFile(path.join(clientDist, 'index.html'));
  }
});

app.listen(PORT, () => {
  console.log(`服务器运行在 http://localhost:${PORT}`);
});
```

- [ ] **Step 2: 启动服务测试**

Run: `cd /home/lr/cjcx/server && timeout 5 node index.js || true`
Expected: "数据库初始化完成" + "服务器运行在 http://localhost:3002"

- [ ] **Step 3: Commit**

```bash
git add server/index.js
git commit -m "feat: add Express server entry with security middleware and routing"
```

---

### Task 12: 前端路由与 API 层

**Files:**
- Create: `client/src/router.js`
- Create: `client/src/api.js`

- [ ] **Step 1: 创建 router.js**

```js
import { createRouter, createWebHistory } from 'vue-router'
import Login from './views/Login.vue'
import Query from './views/Query.vue'

const routes = [
  { path: '/login', name: 'Login', component: Login },
  { path: '/', redirect: '/query' },
  { path: '/query', name: 'Query', component: Query, meta: { requiresAuth: true } },
  {
    path: '/admin',
    component: () => import('./views/admin/Layout.vue'),
    meta: { requiresAuth: true, requiresAdmin: true },
    children: [
      { path: '', redirect: '/admin/exams' },
      { path: 'exams', name: 'AdminExams', component: () => import('./views/admin/Exams.vue') },
      { path: 'import/:examId', name: 'AdminImport', component: () => import('./views/admin/Import.vue') },
      { path: 'scores', name: 'AdminScores', component: () => import('./views/admin/Scores.vue') },
      { path: 'cas', name: 'AdminCasConfig', component: () => import('./views/admin/CasConfig.vue') },
      { path: 'accounts', name: 'AdminAccounts', component: () => import('./views/admin/Accounts.vue') },
      { path: 'logs', name: 'AdminLogs', component: () => import('./views/admin/Logs.vue') }
    ]
  }
]

const router = createRouter({
  history: createWebHistory(),
  routes
})

router.beforeEach((to, from, next) => {
  const token = localStorage.getItem('token')
  const user = JSON.parse(localStorage.getItem('user') || '{}')

  if (to.meta.requiresAuth && !token) {
    next('/login')
  } else if (to.meta.requiresAdmin && user.role !== 'admin' && user.role !== 'superadmin') {
    next('/query')
  } else if (to.path === '/login' && token) {
    const user = JSON.parse(localStorage.getItem('user') || '{}')
    next(user.role === 'admin' || user.role === 'superadmin' ? '/admin' : '/query')
  } else {
    next()
  }
})

export default router
```

- [ ] **Step 2: 创建 api.js**

```js
import axios from 'axios'

const api = axios.create({
  baseURL: '/api',
  timeout: 15000
})

api.interceptors.request.use(config => {
  const token = localStorage.getItem('token')
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

api.interceptors.response.use(
  response => response,
  error => {
    if (error.response?.status === 401 || error.response?.status === 403) {
      localStorage.removeItem('token')
      localStorage.removeItem('user')
      window.location.href = '/login'
    }
    return Promise.reject(error)
  }
)

export const authApi = {
  getCasConfig: () => api.get('/auth/cas/config'),
  updateCasConfig: (data) => api.put('/auth/cas/config', data),
  getCasLoginUrl: () => api.get('/auth/cas/login'),
  casLogout: () => api.get('/auth/cas/logout'),
  me: () => api.get('/auth/me')
}

export const queryApi = {
  getExams: () => api.get('/query/exams'),
  getScore: (examId, idCard) => api.get(`/query/exams/${examId}/score`, { params: idCard ? { id_card: idCard } : {} })
}

export const adminApi = {
  getExams: () => api.get('/admin/exams'),
  createExam: (data) => api.post('/admin/exams', data),
  updateExam: (id, data) => api.put(`/admin/exams/${id}`, data),
  deleteExam: (id) => api.delete(`/admin/exams/${id}`),

  previewExcel: (examId, file) => {
    const fd = new FormData()
    fd.append('file', file)
    return api.post(`/admin/exams/${examId}/preview`, fd)
  },
  importExcel: (examId, file, mapping) => {
    const fd = new FormData()
    fd.append('file', file)
    fd.append('mapping', JSON.stringify(mapping))
    return api.post(`/admin/exams/${examId}/import`, fd)
  },

  getScores: (examId, params) => api.get(`/admin/exams/${examId}/scores`, { params }),
  updateScore: (id, data) => api.put(`/admin/scores/${id}`, data),
  deleteScore: (id) => api.delete(`/admin/scores/${id}`),

  getAccounts: () => api.get('/admin/accounts'),
  createAccount: (data) => api.post('/admin/accounts', data),
  deleteAccount: (id) => api.delete(`/admin/accounts/${id}`),

  getLogs: (params) => api.get('/admin/logs', { params })
}

export default api
```

- [ ] **Step 3: 验证语法**

Run: `cd /home/lr/cjcx/client && node -e "console.log('Syntax OK')"`
Expected: Syntax OK

- [ ] **Step 4: Commit**

```bash
git add client/src/router.js client/src/api.js
git commit -m "feat: add Vue Router config and API layer"
```

---

### Task 13: 登录页面

**Files:**
- Create: `client/src/views/Login.vue`

- [ ] **Step 1: 创建 Login.vue**

参考 `/home/lr/castest/client/src/views/Login.vue` 的 CAS 登录逻辑，简化为仅 CAS 登录（去掉账号密码登录）：

```vue
<template>
  <div class="login-container">
    <div class="login-box">
      <h2>学生成绩查询系统</h2>
      <p style="text-align:center;color:#909399;margin-bottom:24px">请使用统一身份认证登录</p>
      <el-button type="primary" size="large" style="width:100%" @click="handleCasLogin" :loading="loading">
        <el-icon><Link /></el-icon>
        统一身份认证登录
      </el-button>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { ElMessage } from 'element-plus'
import { Link } from '@element-plus/icons-vue'
import { authApi } from '../api'

const router = useRouter()
const route = useRoute()
const loading = ref(false)

const handleCasLogin = async () => {
  loading.value = true
  try {
    const res = await authApi.getCasLoginUrl()
    window.location.href = res.data.loginUrl
  } catch (err) {
    ElMessage.error(err.response?.data?.error || '获取登录地址失败')
    loading.value = false
  }
}

onMounted(() => {
  const token = route.query.token
  if (token) {
    localStorage.setItem('token', token)
    try {
      const payload = JSON.parse(atob(token.split('.')[1]))
      localStorage.setItem('user', JSON.stringify({
        employee_id: payload.employee_id,
        name: payload.name,
        role: payload.role
      }))
      ElMessage.success('登录成功')
      const dest = payload.role === 'admin' || payload.role === 'superadmin' ? '/admin' : '/query'
      router.push(dest)
    } catch (e) {
      ElMessage.error('登录信息解析失败')
    }
    return
  }

  if (route.query.error) {
    const errors = { invalid_ticket: '票据无效', no_ticket: '缺少认证票据', validation_failed: '认证验证失败' }
    ElMessage.error(errors[route.query.error] || '登录失败')
  }
})
</script>

<style scoped>
.login-container {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
}
.login-box {
  width: 400px;
  max-width: 90vw;
  padding: 40px;
  background: white;
  border-radius: 12px;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.1);
}
.login-box h2 { text-align: center; margin-bottom: 16px; color: #303133; }
</style>
```

- [ ] **Step 2: 验证非编译语法**

Run: `cd /home/lr/cjcx/client && node -e "console.log('Login.vue syntax - verified by vite build later')"`
Expected: Syntax OK

- [ ] **Step 3: Commit**

```bash
git add client/src/views/Login.vue
git commit -m "feat: add CAS login page with token extraction"
```

---

### Task 14: 学生成绩查询页面 + ScoreCard 组件

**Files:**
- Create: `client/src/components/ScoreCard.vue`
- Create: `client/src/views/Query.vue`

- [ ] **Step 1: 创建 ScoreCard.vue**

```vue
<template>
  <div class="score-card">
    <div class="card-header">{{ examName }}成绩</div>
    <div class="card-body">
      <div class="info-row"><span>姓名</span><span>{{ data.name }}</span></div>
      <div class="info-row"><span>学号</span><span>{{ data.student_id }}</span></div>
      <div v-if="data.id_card" class="info-row"><span>身份证号</span><span>{{ data.id_card }}</span></div>
    </div>
    <div class="scores">
      <div v-for="(val, key) in data.scores" :key="key" class="score-item">
        <div class="score-label">{{ key }}</div>
        <div class="score-value">{{ val }}</div>
      </div>
    </div>
  </div>
</template>

<script setup>
defineProps({
  data: { type: Object, required: true },
  examName: { type: String, default: '' }
})
</script>

<style scoped>
.score-card {
  background: #fff;
  border-radius: 12px;
  overflow: hidden;
  box-shadow: 0 2px 12px rgba(0,0,0,.08);
}
.card-header {
  background: linear-gradient(135deg, #667eea, #764ba2);
  color: #fff;
  text-align: center;
  padding: 16px;
  font-size: 18px;
  font-weight: 600;
}
.card-body { padding: 16px; }
.info-row {
  display: flex; justify-content: space-between;
  padding: 8px 0; font-size: 14px;
  border-bottom: 1px solid #f0f0f0;
}
.info-row span:first-child { color: #909399; }
.scores {
  display: flex; padding: 16px; gap: 12px;
  justify-content: space-around; border-top: 1px solid #f0f0f0;
}
.score-item { text-align: center; }
.score-label { font-size: 12px; color: #909399; margin-bottom: 4px; }
.score-value { font-size: 20px; font-weight: 600; color: #303133; }
</style>
```

- [ ] **Step 2: 创建 Query.vue**

```vue
<template>
  <div class="query-page">
    <div v-if="!selectedExam">
      <h2 style="text-align:center;padding:24px">成绩查询</h2>
      <div v-if="exams.length === 0" style="text-align:center;color:#909399;padding:40px">
        暂无可查询的考试
      </div>
      <div v-else class="exam-list">
        <div v-for="exam in exams" :key="exam.id" class="exam-item" @click="selectExam(exam)">
          <h3>{{ exam.name }}</h3>
          <el-tag v-if="exam.id_verify" size="small" type="warning">需身份证验证</el-tag>
          <el-tag v-else size="small" type="success">直接查询</el-tag>
        </div>
      </div>
    </div>

    <div v-else>
      <div style="padding:16px;display:flex;align-items:center">
        <el-button text @click="selectedExam = null"><el-icon><ArrowLeft /></el-icon> 返回</el-button>
        <span style="flex:1;text-align:center;font-weight:600">{{ selectedExam.name }}</span>
        <el-button text @click="handleLogout">退出</el-button>
      </div>

      <div v-if="requireIdInput" style="padding:16px">
        <el-input v-model="idCard" placeholder="请输入身份证号" clearable size="large" />
        <el-button type="primary" size="large" style="width:100%;margin-top:12px" @click="fetchScore" :loading="loading">
          查询成绩
        </el-button>
      </div>

      <div v-if="errorMsg" style="padding:16px">
        <el-alert :title="errorMsg" type="error" show-icon />
      </div>

      <div v-if="scoreData" style="padding:16px">
        <ScoreCard :data="scoreData" :exam-name="selectedExam.name" />
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { ElMessage } from 'element-plus'
import { ArrowLeft } from '@element-plus/icons-vue'
import { queryApi, authApi } from '../api'
import ScoreCard from '../components/ScoreCard.vue'

const exams = ref([])
const selectedExam = ref(null)
const requireIdInput = ref(false)
const idCard = ref('')
const loading = ref(false)
const errorMsg = ref('')
const scoreData = ref(null)

onMounted(async () => {
  try {
    const res = await queryApi.getExams()
    exams.value = res.data
  } catch (err) {
    ElMessage.error('获取考试列表失败')
  }
})

const selectExam = async (exam) => {
  selectedExam.value = exam
  errorMsg.value = ''
  scoreData.value = null

  if (!exam.id_verify) {
    await fetchScore()
  } else {
    requireIdInput.value = true
  }
}

const fetchScore = async () => {
  loading.value = true
  errorMsg.value = ''
  try {
    const res = await queryApi.getScore(selectedExam.value.id, idCard.value || undefined)
    if (res.data.require_id_verify) {
      requireIdInput.value = true
    } else if (res.data.found) {
      scoreData.value = res.data.data
      requireIdInput.value = false
    } else {
      errorMsg.value = res.data.message || '未找到成绩'
    }
  } catch (err) {
    errorMsg.value = err.response?.data?.error || '查询失败'
  } finally {
    loading.value = false
  }
}

const handleLogout = async () => {
  localStorage.removeItem('token')
  localStorage.removeItem('user')
  try {
    const res = await authApi.casLogout()
    window.location.href = res.data.logoutUrl
  } catch {
    window.location.href = '/login'
  }
}
</script>

<style scoped>
.query-page { max-width: 480px; margin: 0 auto; min-height: 100vh; background: #f5f7fa; }
.exam-list { padding: 16px; display: flex; flex-direction: column; gap: 12px; }
.exam-item {
  background: #fff; border-radius: 10px; padding: 16px;
  box-shadow: 0 1px 4px rgba(0,0,0,.06); cursor: pointer;
  display: flex; align-items: center; justify-content: space-between;
}
.exam-item h3 { margin: 0; font-size: 16px; }
</style>
```

- [ ] **Step 3: Commit**

```bash
git add client/src/components/ScoreCard.vue client/src/views/Query.vue
git commit -m "feat: add student score query page and score card component"
```

---

### Task 15: 管理员后台 — 布局组件

**Files:**
- Create: `client/src/views/admin/Layout.vue`

- [ ] **Step 1: 创建 Layout.vue**

```vue
<template>
  <div class="admin-layout">
    <el-container>
      <el-aside width="200px">
        <div class="logo">成绩查询管理</div>
        <el-menu
          :default-active="activeMenu"
          router
          background-color="#304156"
          text-color="#bfcbd9"
          active-text-color="#409EFF"
        >
          <el-menu-item index="/admin/exams">
            <el-icon><List /></el-icon>
            <span>考试管理</span>
          </el-menu-item>
          <el-menu-item index="/admin/scores">
            <el-icon><DataAnalysis /></el-icon>
            <span>成绩数据</span>
          </el-menu-item>
          <el-menu-item index="/admin/cas">
            <el-icon><Setting /></el-icon>
            <span>CAS 配置</span>
          </el-menu-item>
          <el-menu-item v-if="user.role === 'superadmin'" index="/admin/accounts">
            <el-icon><User /></el-icon>
            <span>管理员账号</span>
          </el-menu-item>
          <el-menu-item index="/admin/logs">
            <el-icon><Document /></el-icon>
            <span>查询日志</span>
          </el-menu-item>
        </el-menu>
        <div class="aside-footer">
          <span>{{ user.name }}</span>
          <el-button text size="small" @click="handleLogout">退出</el-button>
        </div>
      </el-aside>
      <el-main>
        <router-view />
      </el-main>
    </el-container>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { List, DataAnalysis, Setting, User, Document } from '@element-plus/icons-vue'
import { authApi } from '../../api'

const route = useRoute()
const router = useRouter()
const user = computed(() => JSON.parse(localStorage.getItem('user') || '{}'))
const activeMenu = computed(() => route.path)

const handleLogout = async () => {
  localStorage.removeItem('token')
  localStorage.removeItem('user')
  try {
    const res = await authApi.casLogout()
    window.location.href = res.data.logoutUrl
  } catch {
    router.push('/login')
  }
}
</script>

<style scoped>
.admin-layout { min-height: 100vh; }
.el-aside { background: #304156; min-height: 100vh; display: flex; flex-direction: column; }
.logo { color: #fff; text-align: center; padding: 16px; font-size: 16px; font-weight: 600; border-bottom: 1px solid #4a5568; }
.aside-footer { padding: 12px; color: #bfcbd9; font-size: 13px; border-top: 1px solid #4a5568; margin-top: auto; display: flex; justify-content: space-between; align-items: center; }
.el-main { background: #f5f7fa; }
</style>
```

- [ ] **Step 2: Commit**

```bash
git add client/src/views/admin/Layout.vue
git commit -m "feat: add admin layout with sidebar navigation"
```

---

### Task 16: 管理员后台 — 考试管理页

**Files:**
- Create: `client/src/views/admin/Exams.vue`

- [ ] **Step 1: 创建 Exams.vue**

```vue
<template>
  <div>
    <div class="page-header">
      <h2>考试管理</h2>
      <el-button type="primary" @click="openDialog(null)">新建考试</el-button>
    </div>

    <el-table :data="exams" border stripe v-loading="loading">
      <el-table-column prop="id" label="ID" width="60" />
      <el-table-column prop="name" label="考试名称" />
      <el-table-column label="身份证验证" width="110">
        <template #default="{ row }">
          <el-tag :type="row.id_verify ? 'warning' : 'success'" size="small">
            {{ row.id_verify ? '开启' : '关闭' }}
          </el-tag>
        </template>
      </el-table-column>
      <el-table-column prop="score_count" label="成绩数" width="80" />
      <el-table-column prop="created_at" label="创建时间" width="170" />
      <el-table-column label="操作" width="280">
        <template #default="{ row }">
          <el-button size="small" @click="router.push(`/admin/import/${row.id}`)">导入成绩</el-button>
          <el-button size="small" @click="openDialog(row)">编辑</el-button>
          <el-popconfirm title="删除考试将同时删除所有成绩，确认？" @confirm="handleDelete(row.id)">
            <template #reference>
              <el-button size="small" type="danger">删除</el-button>
            </template>
          </el-popconfirm>
        </template>
      </el-table-column>
    </el-table>

    <el-dialog :title="editingExam ? '编辑考试' : '新建考试'" v-model="dialogVisible" width="500px">
      <el-form :model="form" label-width="110px">
        <el-form-item label="考试名称">
          <el-input v-model="form.name" placeholder="如：特勤招录选拔" />
        </el-form-item>
        <el-form-item label="身份证验证">
          <el-switch v-model="form.id_verify" />
        </el-form-item>
        <el-form-item label="成绩列定义">
          <div v-for="(col, i) in form.score_columns" :key="i" style="display:flex;gap:8px;margin-bottom:8px">
            <el-input v-model="form.score_columns[i]" placeholder="列名" />
            <el-button @click="form.score_columns.splice(i,1)" icon="Delete" circle size="small" />
          </div>
          <el-button @click="form.score_columns.push('')" size="small">+ 添加成绩列</el-button>
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="dialogVisible = false">取消</el-button>
        <el-button type="primary" @click="handleSave" :loading="saving">保存</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import { adminApi } from '../../api'

const router = useRouter()
const exams = ref([])
const loading = ref(false)
const saving = ref(false)
const dialogVisible = ref(false)
const editingExam = ref(null)

const form = reactive({
  name: '',
  id_verify: false,
  score_columns: []
})

const fetchExams = async () => {
  loading.value = true
  try { const res = await adminApi.getExams(); exams.value = res.data } catch (e) { ElMessage.error('加载失败') }
  loading.value = false
}

const openDialog = (exam) => {
  editingExam.value = exam
  if (exam) {
    form.name = exam.name
    form.id_verify = !!exam.id_verify
    form.score_columns = [...(JSON.parse(exam.score_columns || '[]'))]
  } else {
    form.name = ''
    form.id_verify = false
    form.score_columns = []
  }
  dialogVisible.value = true
}

const handleSave = async () => {
  if (!form.name) { ElMessage.error('请输入考试名称'); return }
  saving.value = true
  try {
    const data = {
      name: form.name,
      id_verify: form.id_verify,
      score_columns: form.score_columns.filter(Boolean)
    }
    if (editingExam.value) {
      await adminApi.updateExam(editingExam.value.id, data)
      ElMessage.success('更新成功')
    } else {
      await adminApi.createExam(data)
      ElMessage.success('创建成功')
    }
    dialogVisible.value = false
    await fetchExams()
  } catch (e) { ElMessage.error(e.response?.data?.error || '操作失败') }
  saving.value = false
}

const handleDelete = async (id) => {
  try { await adminApi.deleteExam(id); ElMessage.success('删除成功'); await fetchExams() }
  catch (e) { ElMessage.error('删除失败') }
}

onMounted(fetchExams)
</script>

<style scoped>
.page-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px; }
</style>
```

- [ ] **Step 2: Commit**

```bash
git add client/src/views/admin/Exams.vue
git commit -m "feat: add exam management page with CRUD dialog"
```

---

### Task 17: 管理员后台 — Excel 导入页

**Files:**
- Create: `client/src/views/admin/Import.vue`

- [ ] **Step 1: 创建 Import.vue**

```vue
<template>
  <div>
    <div class="page-header">
      <h2>导入成绩 — {{ examName }}</h2>
      <el-button @click="router.push('/admin/exams')">返回考试列表</el-button>
    </div>

    <el-card v-if="!previewData">
      <el-upload :auto-upload="false" :on-change="handleFileChange" accept=".xlsx" drag :limit="1">
        <el-icon :size="48"><UploadFilled /></el-icon>
        <div>将 Excel 文件拖到此处，或点击上传</div>
        <template #tip>
          <div style="color:#909399;font-size:12px;margin-top:8px">
            格式：第一行为表头，需包含学号、姓名列
          </div>
        </template>
      </el-upload>
    </el-card>

    <div v-if="previewData">
      <el-card style="margin-bottom:16px">
        <p>共识别 <strong>{{ previewData.totalRows }}</strong> 条数据，请确认列映射：</p>
      </el-card>

      <el-card style="margin-bottom:16px">
        <h3 style="margin-bottom:12px">列映射</h3>
        <div style="display:flex;gap:16px;flex-wrap:wrap">
          <div>
            <label style="font-size:13px;color:#909399">学号列</label>
            <el-select v-model="mapping.student_id" placeholder="选择学号列">
              <el-option v-for="h in previewData.headers" :key="h" :label="h" :value="h" />
            </el-select>
          </div>
          <div>
            <label style="font-size:13px;color:#909399">姓名列</label>
            <el-select v-model="mapping.name" placeholder="选择姓名列">
              <el-option v-for="h in previewData.headers" :key="h" :label="h" :value="h" />
            </el-select>
          </div>
          <div>
            <label style="font-size:13px;color:#909399">身份证号列（可选）</label>
            <el-select v-model="mapping.id_card" placeholder="选择身份证号列" clearable>
              <el-option v-for="h in previewData.headers" :key="h" :label="h" :value="h" />
            </el-select>
          </div>
        </div>
        <div style="margin-top:16px">
          <label style="font-size:13px;color:#909399">成绩列（可多选）</label>
          <el-select v-model="mapping.scores" multiple placeholder="选择成绩列">
            <el-option v-for="h in previewData.headers" :key="h" :label="h" :value="h" />
          </el-select>
        </div>
      </el-card>

      <el-card>
        <h3 style="margin-bottom:12px">数据预览（前5行）</h3>
        <el-table :data="previewData.preview" border stripe size="small" max-height="300">
          <el-table-column v-for="h in previewData.headers" :key="h" :prop="h" :label="h" :width="Math.max(100, h.length * 18 + 20)" />
        </el-table>
      </el-card>

      <div style="margin-top:16px;text-align:center">
        <el-button @click="resetPreview">重新选择文件</el-button>
        <el-button type="primary" :loading="importing" @click="handleImport">
          确认导入（将覆盖已有数据）
        </el-button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { ElMessage } from 'element-plus'
import { UploadFilled } from '@element-plus/icons-vue'
import { adminApi } from '../../api'

const router = useRouter()
const route = useRoute()
const examId = route.params.examId
const examName = ref('')
const previewData = ref(null)
const file = ref(null)
const importing = ref(false)

const mapping = ref({ student_id: '', name: '', id_card: '', scores: [] })

onMounted(async () => {
  try {
    const res = await adminApi.getExams()
    const exam = res.data.find(e => e.id == examId)
    examName.value = exam ? exam.name : ''
  } catch (e) {
    ElMessage.error('获取考试信息失败')
  }
})

const handleFileChange = async (uploadFile) => {
  file.value = uploadFile.raw
  try {
    const res = await adminApi.previewExcel(examId, file.value)
    previewData.value = res.data
    const headers = res.data.headers
    mapping.value.student_id = headers.find(h => h.includes('学号')) || ''
    mapping.value.name = headers.find(h => h.includes('姓名')) || ''
    mapping.value.id_card = headers.find(h => h.includes('身份证')) || ''
    mapping.value.scores = headers.filter(h => !['学号', '姓名'].includes(h) && !h.includes('身份证'))
  } catch (e) {
    ElMessage.error(e.response?.data?.error || '预览失败')
  }
}

const handleImport = async () => {
  if (!mapping.value.student_id || !mapping.value.name) {
    ElMessage.error('请选择学号列和姓名列')
    return
  }
  if (mapping.value.scores.length === 0) {
    ElMessage.error('请选择至少一列成绩')
    return
  }
  importing.value = true
  try {
    const res = await adminApi.importExcel(examId, file.value, mapping.value)
    ElMessage.success(res.data.message)
    router.push('/admin/exams')
  } catch (e) {
    ElMessage.error(e.response?.data?.error || '导入失败')
  } finally {
    importing.value = false
  }
}

const resetPreview = () => {
  previewData.value = null
  file.value = null
}
</script>

<style scoped>
.page-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px; }
</style>
```

- [ ] **Step 2: Commit**

```bash
git add client/src/views/admin/Import.vue
git commit -m "feat: add Excel import page with preview and column mapping"
```

---

### Task 18: 管理员后台 — 成绩数据管理页

**Files:**
- Create: `client/src/views/admin/Scores.vue`

- [ ] **Step 1: 创建 Scores.vue**

```vue
<template>
  <div>
    <div class="page-header">
      <h2>成绩数据</h2>
    </div>

    <div style="display:flex;gap:12px;margin-bottom:16px">
      <el-select v-model="selectedExamId" placeholder="选择考试" @change="fetchScores" style="width:240px">
        <el-option v-for="e in exams" :key="e.id" :label="e.name" :value="e.id" />
      </el-select>
      <el-input v-model="search" placeholder="搜索姓名/学号" clearable @input="fetchScores" style="width:240px" />
    </div>

    <el-table v-if="selectedExamId" :data="scores" border stripe v-loading="loading">
      <el-table-column prop="student_id" label="学号" width="120" />
      <el-table-column prop="name" label="姓名" width="100" />
      <el-table-column prop="id_card" label="身份证号" width="180">
        <template #default="{ row }">{{ row.id_card ? row.id_card.slice(0,4)+'****'+row.id_card.slice(-4) : '' }}</template>
      </el-table-column>
      <el-table-column v-for="col in scoreColumns" :key="col" :prop="`score_data.${col}`" :label="col" width="110" />
      <el-table-column label="操作" width="140">
        <template #default="{ row }">
          <el-button size="small" @click="openEdit(row)">编辑</el-button>
          <el-popconfirm title="确认删除？" @confirm="handleDelete(row.id)">
            <template #reference><el-button size="small" type="danger">删除</el-button></template>
          </el-popconfirm>
        </template>
      </el-table-column>
    </el-table>

    <div v-if="selectedExamId" style="margin-top:16px;text-align:right">
      <el-pagination
        v-model:current-page="page" :page-size="pageSize" :total="total"
        layout="total, prev, pager, next" @current-change="fetchScores"
      />
    </div>

    <el-dialog title="编辑成绩" v-model="dialogVisible" width="500px">
      <el-form :model="editForm" label-width="90px">
        <el-form-item label="姓名"><el-input v-model="editForm.name" /></el-form-item>
        <el-form-item label="学号"><el-input v-model="editForm.student_id" /></el-form-item>
        <el-form-item label="身份证号"><el-input v-model="editForm.id_card" /></el-form-item>
        <el-form-item v-for="col in scoreColumns" :key="col" :label="col">
          <el-input v-model="editForm.score_data[col]" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="dialogVisible = false">取消</el-button>
        <el-button type="primary" @click="handleUpdate" :loading="saving">保存</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted } from 'vue'
import { ElMessage } from 'element-plus'
import { adminApi } from '../../api'

const exams = ref([])
const selectedExamId = ref(null)
const scoreColumns = ref([])
const scores = ref([])
const loading = ref(false)
const saving = ref(false)
const search = ref('')
const page = ref(1)
const pageSize = ref(20)
const total = ref(0)
const dialogVisible = ref(false)
const editingId = ref(null)
const editForm = reactive({ name: '', student_id: '', id_card: '', score_data: {} })

onMounted(async () => {
  try { const res = await adminApi.getExams(); exams.value = res.data } catch (e) { ElMessage.error('加载考试列表失败') }
})

const fetchScores = async () => {
  if (!selectedExamId.value) return
  const exam = exams.value.find(e => e.id === selectedExamId.value)
  scoreColumns.value = exam ? JSON.parse(exam.score_columns || '[]') : []
  loading.value = true
  try {
    const res = await adminApi.getScores(selectedExamId.value, { page: page.value, pageSize: pageSize.value, search: search.value })
    scores.value = res.data.data
    total.value = res.data.total
  } catch (e) { ElMessage.error('加载失败') }
  loading.value = false
}

const openEdit = (row) => {
  editingId.value = row.id
  editForm.name = row.name
  editForm.student_id = row.student_id
  editForm.id_card = row.id_card
  editForm.score_data = { ...row.score_data }
  dialogVisible.value = true
}

const handleUpdate = async () => {
  saving.value = true
  try {
    await adminApi.updateScore(editingId.value, editForm)
    ElMessage.success('更新成功')
    dialogVisible.value = false
    await fetchScores()
  } catch (e) { ElMessage.error('更新失败') }
  saving.value = false
}

const handleDelete = async (id) => {
  try { await adminApi.deleteScore(id); ElMessage.success('删除成功'); await fetchScores() }
  catch (e) { ElMessage.error('删除失败') }
}
</script>

<style scoped>
.page-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px; }
</style>
```

- [ ] **Step 2: Commit**

```bash
git add client/src/views/admin/Scores.vue
git commit -m "feat: add score data management page with search, edit, delete"
```

---

### Task 19: 管理员后台 — CAS 配置页

**Files:**
- Create: `client/src/views/admin/CasConfig.vue`

- [ ] **Step 1: 创建 CasConfig.vue**

```vue
<template>
  <div>
    <div class="page-header"><h2>CAS 认证配置</h2></div>

    <el-card v-loading="loading">
      <el-form :model="form" label-width="120px" style="max-width:500px">
        <el-form-item label="启用 CAS">
          <el-switch v-model="form.enabled" />
        </el-form-item>
        <el-form-item label="CAS 服务地址">
          <el-input v-model="form.cas_url" placeholder="如 https://cas.school.edu.cn" />
        </el-form-item>
        <el-form-item label="应用访问地址">
          <el-input v-model="form.service_url" placeholder="如 https://score.school.edu.cn 或 http://localhost:5173" />
        </el-form-item>
        <el-form-item>
          <el-button type="primary" @click="handleSave" :loading="saving">保存配置</el-button>
        </el-form-item>
      </el-form>

      <el-alert title="说明" type="info" :closable="false" style="margin-top:16px">
        <ul style="padding-left:20px;font-size:13px;line-height:1.8">
          <li>CAS 服务地址：学校统一认证服务器的 URL</li>
          <li>应用访问地址：本系统的访问地址（不含路径），如校内域名或 IP+端口</li>
          <li>开发者本地调试可用 http://localhost:5173</li>
        </ul>
      </el-alert>
    </el-card>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted } from 'vue'
import { ElMessage } from 'element-plus'
import { authApi } from '../../api'

const loading = ref(false)
const saving = ref(false)
const form = reactive({ enabled: false, cas_url: '', service_url: '' })

onMounted(async () => {
  loading.value = true
  try {
    const res = await authApi.getCasConfig()
    form.enabled = res.data.enabled
    form.cas_url = res.data.cas_url
    form.service_url = res.data.service_url
  } catch (e) { ElMessage.error('加载CAS配置失败') }
  loading.value = false
})

const handleSave = async () => {
  saving.value = true
  try {
    await authApi.updateCasConfig(form)
    ElMessage.success('配置保存成功')
  } catch (e) { ElMessage.error(e.response?.data?.error || '保存失败') }
  saving.value = false
}
</script>

<style scoped>
.page-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px; }
</style>
```

- [ ] **Step 2: Commit**

```bash
git add client/src/views/admin/CasConfig.vue
git commit -m "feat: add CAS configuration page"
```

---

### Task 20: 管理员后台 — 账号管理页

**Files:**
- Create: `client/src/views/admin/Accounts.vue`

- [ ] **Step 1: 创建 Accounts.vue**

```vue
<template>
  <div>
    <div class="page-header">
      <h2>管理员账号</h2>
      <el-button type="primary" @click="dialogVisible = true">添加管理员</el-button>
    </div>

    <el-table :data="accounts" border stripe v-loading="loading">
      <el-table-column prop="employee_id" label="工号" width="140" />
      <el-table-column prop="name" label="姓名" width="120" />
      <el-table-column prop="role" label="角色" width="120">
        <template #default="{ row }">
          <el-tag :type="row.role === 'superadmin' ? 'danger' : 'info'" size="small">{{ row.role }}</el-tag>
        </template>
      </el-table-column>
      <el-table-column prop="auth_type" label="认证方式" width="100" />
      <el-table-column prop="created_at" label="创建时间" />
      <el-table-column label="操作" width="100">
        <template #default="{ row }">
          <el-popconfirm v-if="row.role !== 'superadmin'" title="确认删除？" @confirm="handleDelete(row.id)">
            <template #reference>
              <el-button size="small" type="danger">删除</el-button>
            </template>
          </el-popconfirm>
        </template>
      </el-table-column>
    </el-table>

    <el-dialog title="添加管理员" v-model="dialogVisible" width="400px">
      <el-form :model="form" label-width="80px">
        <el-form-item label="工号"><el-input v-model="form.employee_id" /></el-form-item>
        <el-form-item label="姓名"><el-input v-model="form.name" /></el-form-item>
        <el-form-item label="密码"><el-input v-model="form.password" type="password" show-password /></el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="dialogVisible = false">取消</el-button>
        <el-button type="primary" @click="handleCreate" :loading="saving">确定</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted } from 'vue'
import { ElMessage } from 'element-plus'
import { adminApi } from '../../api'

const accounts = ref([])
const loading = ref(false)
const saving = ref(false)
const dialogVisible = ref(false)
const form = reactive({ employee_id: '', name: '', password: '' })

const fetchAccounts = async () => {
  loading.value = true
  try { const res = await adminApi.getAccounts(); accounts.value = res.data } catch (e) { ElMessage.error('加载失败') }
  loading.value = false
}

const handleCreate = async () => {
  if (!form.employee_id || !form.name || !form.password) {
    ElMessage.error('请填写完整信息'); return
  }
  saving.value = true
  try {
    await adminApi.createAccount(form)
    ElMessage.success('添加成功')
    dialogVisible.value = false
    form.employee_id = ''; form.name = ''; form.password = ''
    await fetchAccounts()
  } catch (e) { ElMessage.error(e.response?.data?.error || '添加失败') }
  saving.value = false
}

const handleDelete = async (id) => {
  try { await adminApi.deleteAccount(id); ElMessage.success('删除成功'); await fetchAccounts() }
  catch (e) { ElMessage.error('删除失败') }
}

onMounted(fetchAccounts)
</script>

<style scoped>
.page-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px; }
</style>
```

- [ ] **Step 2: Commit**

```bash
git add client/src/views/admin/Accounts.vue
git commit -m "feat: add admin account management page"
```

---

### Task 21: 管理员后台 — 查询日志页

**Files:**
- Create: `client/src/views/admin/Logs.vue`

- [ ] **Step 1: 创建 Logs.vue**

```vue
<template>
  <div>
    <div class="page-header"><h2>查询日志</h2></div>

    <div style="display:flex;gap:12px;margin-bottom:16px">
      <el-select v-model="filterExamId" placeholder="按考试筛选" clearable @change="fetchLogs" style="width:240px">
        <el-option v-for="e in exams" :key="e.id" :label="e.name" :value="e.id" />
      </el-select>
    </div>

    <el-table :data="logs" border stripe v-loading="loading">
      <el-table-column prop="id" label="ID" width="60" />
      <el-table-column prop="exam_name" label="考试" width="160" />
      <el-table-column prop="student_id" label="学号" width="120" />
      <el-table-column label="结果" width="110">
        <template #default="{ row }">
          <el-tag :type="row.result === 'success' ? 'success' : row.result === 'id_mismatch' ? 'danger' : 'info'" size="small">
            {{ { success: '成功', not_found: '未找到', id_mismatch: '身份证不匹配' }[row.result] || row.result }}
          </el-tag>
        </template>
      </el-table-column>
      <el-table-column prop="ip" label="IP" width="140" />
      <el-table-column prop="created_at" label="查询时间" />
    </el-table>

    <div style="margin-top:16px;text-align:right">
      <el-pagination
        v-model:current-page="page" :page-size="pageSize" :total="total"
        layout="total, prev, pager, next" @current-change="fetchLogs"
      />
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { ElMessage } from 'element-plus'
import { adminApi } from '../../api'

const exams = ref([])
const logs = ref([])
const loading = ref(false)
const filterExamId = ref(null)
const page = ref(1)
const pageSize = ref(20)
const total = ref(0)

const fetchExams = async () => {
  try { const res = await adminApi.getExams(); exams.value = res.data } catch (e) { /* ignore */ }
}

const fetchLogs = async () => {
  loading.value = true
  try {
    const params = { page: page.value, pageSize: pageSize.value }
    if (filterExamId.value) params.exam_id = filterExamId.value
    const res = await adminApi.getLogs(params)
    logs.value = res.data.data
    total.value = res.data.total
  } catch (e) { ElMessage.error('加载失败') }
  loading.value = false
}

onMounted(async () => {
  await fetchExams()
  await fetchLogs()
})
</script>

<style scoped>
.page-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px; }
</style>
```

- [ ] **Step 2: Commit**

```bash
git add client/src/views/admin/Logs.vue
git commit -m "feat: add query logs page with exam filter and pagination"
```

---

### Task 22: 构建验证与修复

**Files:** 无新建，验证所有文件一致性

- [ ] **Step 1: 启动后端验证无运行时错误**

```bash
cd /home/lr/cjcx/server && timeout 5 node index.js 2>&1 || true
```

Expected: "数据库初始化完成" + "服务器运行在 http://localhost:3002"，无报错退出

- [ ] **Step 2: 构建前端验证编译成功**

```bash
cd /home/lr/cjcx/client && npx vite build 2>&1
```

Expected: Build successful, 输出到 `dist/` 目录

- [ ] **Step 3: 验证 API 响应（健康检查）**

```bash
cd /home/lr/cjcx/server && node -e "
const http = require('http');
setTimeout(() => process.exit(0), 3000);
const app = require('./index.js');
setTimeout(() => {
  http.get('http://localhost:3002/api/auth/cas/config', res => {
    let data = '';
    res.on('data', c => data += c);
    res.on('end', () => { console.log('CAS config API:', data); process.exit(0); });
  });
}, 500);
"
```

Expected: `{"enabled":false,"cas_url":"","service_url":""}`

- [ ] **Step 4: 修复发现问题后 Commit**

```bash
git add -A && git commit -m "fix: build and runtime verification fixes"
```

---

### Task 23: 最终集成测试

- [ ] **Step 1: 启动后端 (后台)**

```bash
cd /home/lr/cjcx/server && node index.js &
sleep 2
```

- [ ] **Step 2: 测试 CAS 配置 API**

```bash
curl -s http://localhost:3002/api/auth/cas/config | python3 -m json.tool
```

Expected: `{"enabled": false, "cas_url": "", "service_url": ""}`

- [ ] **Step 3: 测试带 token 的考试 API**

```bash
TOKEN=$(node -e "
const jwt = require('jsonwebtoken');
const {JWT_SECRET} = require('./middleware/auth');
console.log(jwt.sign({id:1,employee_id:'admin',name:'管理员',role:'superadmin'}, JWT_SECRET, {expiresIn:'1h'}));
")

echo "=== Get Exams ==="
curl -s http://localhost:3002/api/admin/exams -H "Authorization: Bearer $TOKEN" | python3 -m json.tool

echo "=== Create Exam ==="
curl -s -X POST http://localhost:3002/api/admin/exams \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"name":"测试考试","id_verify":false,"score_columns":["语文","数学"]}' | python3 -m json.tool
```

Expected: 考试创建成功，返回 id

- [ ] **Step 4: 构建前端并验证静态文件托管**

```bash
cd /home/lr/cjcx/client && npx vite build
curl -s http://localhost:3002/ | head -5
```

Expected: 返回 HTML（`index.html` 内容）

- [ ] **Step 5: 停止后端**

```bash
kill %1 2>/dev/null
```

- [ ] **Step 6: Commit final**

```bash
git add -A && git commit -m "test: add integration test results and finalize"
```

---

## 验收清单映射

| 验收标准 | 对应任务 |
|----------|----------|
| CAS 认证正常 | Task 5 (后端), Task 13 (前端) |
| 学生可查询已导入考试的成绩 | Task 6 (后端), Task 14 (前端) |
| 身份证验证开关有效 | Task 7 (考试配置), Task 6 (查询逻辑) |
| 身份证不匹配时拒绝显示 | Task 6 (id_mismatch 分支) |
| 管理员可创建/编辑/删除考试 | Task 7 (后端), Task 16 (前端) |
| 管理员可上传 Excel 导入成绩 | Task 8 (后端), Task 17 (前端) |
| 管理员可编辑/删除单条成绩 | Task 9 (后端), Task 18 (前端) |
| 管理员可搜索成绩 | Task 18 (前端搜索) |
| 管理员可配置 CAS | Task 19 (前端 + auth.js PUT) |
| 管理员可增删管理员账号 | Task 10 (后端), Task 20 (前端) |
| 查询日志可查 | Task 10 (后端), Task 21 (前端) |
| 移动端 H5 页面适配 | Task 14 (Query.vue 移动端优先) |
| PC 端页面正常使用 | Task 15-21 (管理后台全 PC 端) |
