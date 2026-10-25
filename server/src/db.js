import Database from 'better-sqlite3';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const hasTestFileArg = process.argv.some((arg) => {
  if (!arg) return false;
  return /(?:^|[\\/])test[\\/]|\.test\.[cm]?js$/i.test(arg) || arg.includes('node:test');
});
const isTestRun = process.env.NODE_ENV === 'test' || hasTestFileArg;
const defaultDbPath = isTestRun
  ? path.resolve(__dirname, '../peerlearn.test.db')
  : path.resolve(__dirname, '../peerlearn.db');
const dbPath = process.env.DB_PATH || defaultDbPath;

const dbDir = path.dirname(dbPath);
if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true });
}

const db = new Database(dbPath);
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

db.exec(`
CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  bio TEXT NOT NULL DEFAULT '',
  avatar_data TEXT,
  points INTEGER NOT NULL DEFAULT 20,
  role TEXT NOT NULL DEFAULT 'student',
  suspended INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS skills (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  subject TEXT NOT NULL,
  topic TEXT NOT NULL,
  kind TEXT NOT NULL CHECK(kind IN ('teach','learn')),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS sessions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  tutor_id INTEGER NOT NULL,
  learner_id INTEGER NOT NULL,
  subject TEXT NOT NULL,
  topic TEXT NOT NULL,
  scheduled_at TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending','accepted','declined','cancelled','completed')),
  request_by TEXT NOT NULL DEFAULT 'learner' CHECK(request_by IN ('learner','tutor')),
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (tutor_id) REFERENCES users(id),
  FOREIGN KEY (learner_id) REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS reviews (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  session_id INTEGER NOT NULL UNIQUE,
  reviewer_id INTEGER NOT NULL,
  reviewee_id INTEGER NOT NULL,
  rating INTEGER NOT NULL CHECK(rating BETWEEN 1 AND 5),
  comment TEXT NOT NULL DEFAULT '',
  hidden INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (session_id) REFERENCES sessions(id),
  FOREIGN KEY (reviewer_id) REFERENCES users(id),
  FOREIGN KEY (reviewee_id) REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS reports (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  review_id INTEGER NOT NULL,
  reporter_id INTEGER NOT NULL,
  reason TEXT NOT NULL DEFAULT '',
  UNIQUE(review_id, reporter_id),
  FOREIGN KEY (review_id) REFERENCES reviews(id),
  FOREIGN KEY (reporter_id) REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS certificates (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  session_id INTEGER NOT NULL UNIQUE,
  tutor_id INTEGER NOT NULL,
  learner_id INTEGER NOT NULL,
  rating INTEGER NOT NULL CHECK(rating BETWEEN 1 AND 5),
  issued_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (session_id) REFERENCES sessions(id),
  FOREIGN KEY (tutor_id) REFERENCES users(id),
  FOREIGN KEY (learner_id) REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS safety_reports (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  session_id INTEGER NOT NULL,
  reporter_id INTEGER NOT NULL,
  details TEXT NOT NULL,
  category TEXT NOT NULL DEFAULT 'needs_review',
  urgency TEXT NOT NULL DEFAULT 'unclassified',
  summary TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'awaiting_human_review',
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (session_id) REFERENCES sessions(id),
  FOREIGN KEY (reporter_id) REFERENCES users(id)
);
`);

const userColumns = db.prepare('PRAGMA table_info(users)').all();
if (!userColumns.some((column) => column.name === 'avatar_data')) {
  db.exec('ALTER TABLE users ADD COLUMN avatar_data TEXT');
}
const sessionColumns = db.prepare('PRAGMA table_info(sessions)').all();
if (!sessionColumns.some((column) => column.name === 'request_by')) {
  db.exec("ALTER TABLE sessions ADD COLUMN request_by TEXT NOT NULL DEFAULT 'learner'");
}

export default db;
