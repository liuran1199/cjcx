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
    db.prepare(`INSERT INTO cas_config (id, enabled, cas_url, service_url) VALUES (1, 0, '', '')`).run();
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
