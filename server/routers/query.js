const express = require('express');
const { getDb } = require('../database');
const { authenticateToken } = require('../middleware/auth');
const { decrypt, maskIdCard } = require('../utils/crypto');

const router = express.Router();

// GET  /api/query/exams          —  get list of queryable exams
router.get('/exams', authenticateToken, (req, res) => {
  const db = getDb();
  const exams = db.prepare('SELECT id, name, id_verify, created_at FROM exams WHERE enabled = 1 ORDER BY id DESC').all();
  res.json(exams);
});

// GET  /api/query/exams/:id/score —  query score
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

  // Determine result type for logging
  let logResult;
  if (!score) {
    logResult = 'not_found';
  } else if (exam.id_verify) {
    if (!id_card) {
      // ID required but not provided — don't log yet, just prompt
      return res.json({ found: true, require_id_verify: true });
    }
    const decrypted = decrypt(score.id_card);
    if (decrypted !== id_card) {
      logResult = 'id_mismatch';
      db.prepare('INSERT INTO query_logs (exam_id, student_id, ip, result) VALUES (?,?,?,?)')
        .run(examId, studentId, req.ip, 'id_mismatch');
      return res.status(400).json({ error: '身份证号不匹配' });
    }
    logResult = 'success';
  } else {
    logResult = 'success';
  }

  // Log successful queries
  db.prepare('INSERT INTO query_logs (exam_id, student_id, ip, result) VALUES (?,?,?,?)')
    .run(examId, studentId, req.ip, logResult);

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
