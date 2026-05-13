const express = require('express');
const multer = require('multer');
const XLSX = require('xlsx');
const bcrypt = require('bcryptjs');
const { getDb } = require('../database');
const { authenticateToken, requireAdmin, requireSuperAdmin } = require('../middleware/auth');
const { encrypt, decrypt } = require('../utils/crypto');

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage() });

// All routes require login + admin
router.use(authenticateToken, requireAdmin);

// ==================== Exam Management ====================

// GET  /api/admin/exams      —  list exams with score counts
router.get('/exams', (req, res) => {
  const db = getDb();
  const exams = db.prepare('SELECT * FROM exams ORDER BY id DESC').all();
  exams.forEach(e => {
    const count = db.prepare('SELECT COUNT(*) as cnt FROM scores WHERE exam_id = ?').get(e.id);
    e.score_count = count.cnt;
  });
  res.json(exams);
});

// POST /api/admin/exams      —  create exam
router.post('/exams', (req, res) => {
  const { name, id_verify, score_columns, enabled } = req.body;
  if (!name) {
    return res.status(400).json({ error: '考试名称不能为空' });
  }
  const db = getDb();
  const result = db.prepare('INSERT INTO exams (name, id_verify, score_columns, enabled) VALUES (?,?,?,?)')
    .run(name, id_verify ? 1 : 0, JSON.stringify(score_columns || []), enabled !== undefined ? (enabled ? 1 : 0) : 1);
  res.status(201).json({ id: result.lastInsertRowid, message: '创建成功' });
});

// PUT  /api/admin/exams/:id  —  update exam
router.put('/exams/:id', (req, res) => {
  const { name, id_verify, score_columns, enabled } = req.body;
  const db = getDb();
  const exam = db.prepare('SELECT * FROM exams WHERE id = ?').get(req.params.id);
  if (!exam) return res.status(404).json({ error: '考试不存在' });
  db.prepare('UPDATE exams SET name=?, id_verify=?, score_columns=?, enabled=? WHERE id=?')
    .run(name || exam.name, id_verify !== undefined ? (id_verify ? 1 : 0) : exam.id_verify,
      JSON.stringify(score_columns || JSON.parse(exam.score_columns || '[]')),
      enabled !== undefined ? (enabled ? 1 : 0) : exam.enabled,
      req.params.id);
  res.json({ message: '更新成功' });
});

// DELETE /api/admin/exams/:id —  delete exam and all its scores/logs
router.delete('/exams/:id', (req, res) => {
  const db = getDb();
  const exam = db.prepare('SELECT * FROM exams WHERE id = ?').get(req.params.id);
  if (!exam) return res.status(404).json({ error: '考试不存在' });
  db.prepare('DELETE FROM scores WHERE exam_id = ?').run(req.params.id);
  db.prepare('DELETE FROM query_logs WHERE exam_id = ?').run(req.params.id);
  db.prepare('DELETE FROM exams WHERE id = ?').run(req.params.id);
  res.json({ message: '删除成功' });
});

// ==================== Excel Import ====================

// GET  /api/admin/exams/:id/template —  download Excel template
router.get('/exams/:id/template', (req, res) => {
  const db = getDb();
  const exam = db.prepare('SELECT * FROM exams WHERE id = ?').get(req.params.id);
  if (!exam) return res.status(404).json({ error: '考试不存在' });

  const headers = ['学号', '姓名'];
  if (exam.id_verify) headers.push('身份证号');
  const scoreCols = JSON.parse(exam.score_columns || '[]');
  headers.push(...scoreCols);

  const ws = XLSX.utils.aoa_to_sheet([headers]);
  ws['!cols'] = headers.map(() => ({ wch: 18 }));
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Sheet1');
  const buf = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });

  res.attachment(`${exam.name}_导入模版.xlsx`);
  res.send(buf);
});

// POST /api/admin/exams/:id/preview  —  preview Excel headers + first 5 rows
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

// POST /api/admin/exams/:id/import   —  confirm and import data
router.post('/exams/:id/import', upload.single('file'), (req, res) => {
  const examId = req.params.id;
  const db = getDb();

  const exam = db.prepare('SELECT * FROM exams WHERE id = ?').get(examId);
  if (!exam) return res.status(404).json({ error: '考试不存在' });

  let mapping;
  try {
    mapping = typeof req.body.mapping === 'string' ? JSON.parse(req.body.mapping) : req.body.mapping;
  } catch {
    return res.status(400).json({ error: '列映射格式错误' });
  }

  if (!req.file) {
    return res.status(400).json({ error: '请上传文件' });
  }

  try {
    const workbook = XLSX.read(req.file.buffer, { type: 'buffer' });
    const sheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];
    const data = XLSX.utils.sheet_to_json(sheet, { header: 1 });

    const headers = data[0].map(String);
    const studentIdCol = headers.indexOf(mapping.student_id);
    const nameCol = headers.indexOf(mapping.name);
    const idCardCol = mapping.id_card ? headers.indexOf(mapping.id_card) : -1;

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

    const scoreCols = (mapping.scores || []).map(s => headers.indexOf(s));
    const rows = [];
    for (let i = 1; i < data.length; i++) {
      const row = data[i];
      const studentId = String(row[studentIdCol] || '').trim();
      if (!studentId) continue;

      const scoreData = {};
      (mapping.scores || []).forEach((s, idx) => {
        if (scoreCols[idx] !== -1) {
          scoreData[s] = row[scoreCols[idx]];
        }
      });

      rows.push({
        student_id: studentId,
        name: String(row[nameCol] || '').trim(),
        id_card: encrypt(idCardCol !== -1 ? String(row[idCardCol] || '').trim() : ''),
        score_data: JSON.stringify(scoreData)
      });
    }

    insertMany(rows);

    db.prepare('UPDATE exams SET score_columns = ? WHERE id = ?')
      .run(JSON.stringify(mapping.scores || []), examId);

    res.json({ message: `成功导入 ${rows.length} 条成绩` });
  } catch (err) {
    console.error('导入失败:', err.message);
    res.status(500).json({ error: '导入失败: ' + err.message });
  }
});

// ==================== Score Management ====================

// GET  /api/admin/exams/:id/scores  —  score list with search + pagination
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

// PUT  /api/admin/scores/:id     —  edit a single score record
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

// DELETE /api/admin/scores/:id   —  delete a single score record
router.delete('/scores/:id', (req, res) => {
  const db = getDb();
  const score = db.prepare('SELECT * FROM scores WHERE id = ?').get(req.params.id);
  if (!score) return res.status(404).json({ error: '成绩不存在' });
  db.prepare('DELETE FROM scores WHERE id = ?').run(req.params.id);
  res.json({ message: '删除成功' });
});

// ==================== Admin Account Management (superadmin) ====================

// GET  /api/admin/accounts    —  list admin accounts
router.get('/accounts', requireSuperAdmin, (req, res) => {
  const db = getDb();
  const accounts = db.prepare('SELECT id, employee_id, name, role, auth_type, created_at FROM admins ORDER BY id').all();
  res.json(accounts);
});

// POST /api/admin/accounts    —  add admin account
router.post('/accounts', requireSuperAdmin, (req, res) => {
  const { employee_id, password, name, role = 'admin' } = req.body;
  if (!employee_id || !password || !name) {
    return res.status(400).json({ error: '请填写完整信息' });
  }
  const db = getDb();
  const existing = db.prepare('SELECT id FROM admins WHERE employee_id = ?').get(employee_id);
  if (existing) return res.status(400).json({ error: '工号已存在' });

  const hash = bcrypt.hashSync(password, 10);
  db.prepare('INSERT INTO admins (employee_id, password, name, role, auth_type) VALUES (?,?,?,?,?)')
    .run(employee_id, hash, name, role, 'local');
  res.status(201).json({ message: '创建成功' });
});

// DELETE /api/admin/accounts/:id —  delete admin account
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

// ==================== Query Logs ====================

// GET  /api/admin/logs       —  query logs with exam filter + pagination
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

module.exports = { router, upload };
