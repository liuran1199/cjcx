const Database = require('better-sqlite3');
const path = require('path');
const bcrypt = require('bcryptjs');

const dbPath = path.join(__dirname, 'campus.db');
let db;

function initDatabase() {
  if (db) return db;

  try {
    db = new Database(dbPath);
  } catch (err) {
    throw new Error(`Failed to open database at ${dbPath}: ${err.message}`);
  }

  db.pragma('journal_mode = WAL');
  db.pragma('foreign_keys = ON');

  try {
    db.exec(`
      CREATE TABLE IF NOT EXISTS exams (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        id_verify INTEGER DEFAULT 0,
        enabled INTEGER DEFAULT 1,
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
  } catch (err) {
    throw new Error(`Failed to initialize database schema: ${err.message}`);
  }

  // Migration: add enabled column if it doesn't exist
  try { db.exec('ALTER TABLE exams ADD COLUMN enabled INTEGER DEFAULT 1'); } catch {}
  // Set all existing exams to enabled
  db.prepare("UPDATE exams SET enabled = 1 WHERE enabled IS NULL").run();

  const row = db.prepare('SELECT id FROM cas_config WHERE id = 1').get();
  if (!row) {
    db.prepare(`INSERT INTO cas_config (id, enabled, cas_url, service_url) VALUES (1, 0, '', '')`).run();
  }

  const admin = db.prepare('SELECT id FROM admins WHERE employee_id = ?').get('admin');
  if (!admin) {
    const hash = bcrypt.hashSync('admin123', 10);
    db.prepare('INSERT INTO admins (employee_id, password, name, role, auth_type) VALUES (?,?,?,?,?)')
      .run('admin', hash, '系统管理员', 'superadmin', 'local');
  }


  return db;
}

function getDb() {
  if (!db) {
    throw new Error('Database not initialized. Call initDatabase() first.');
  }
  return db;
}

function closeDatabase() {
  if (db) {
    db.close();
    db = null;
  }
}

module.exports = { initDatabase, getDb, closeDatabase };
