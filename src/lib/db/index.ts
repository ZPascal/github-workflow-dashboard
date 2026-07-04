import 'server-only';
import Database from 'better-sqlite3';
import fs from 'fs';
import path from 'path';

function getEncryptionKey(): Buffer {
  const hex = process.env.GWD_ENCRYPTION_KEY;
  if (!hex || !/^[0-9a-fA-F]{64}$/.test(hex)) {
    throw new Error('GWD_ENCRYPTION_KEY must be a 32-byte hex string (64 hex chars)');
  }
  return Buffer.from(hex, 'hex');
}

// Validate key at module load time so the server refuses to start if misconfigured.
export const encryptionKey: Buffer = getEncryptionKey();

const dbPath = process.env.GWD_DB_PATH ?? path.join(process.cwd(), 'data', 'gwd.db');

const dbDir = path.dirname(dbPath);
if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true });
}

const db = new Database(dbPath);
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');
db.pragma('busy_timeout = 5000');

db.exec(`
  CREATE TABLE IF NOT EXISTS sessions (
    id TEXT PRIMARY KEY,
    github_user_id TEXT NOT NULL,
    created_at INTEGER NOT NULL,
    expires_at INTEGER NOT NULL
  );

  CREATE TABLE IF NOT EXISTS user_tokens (
    github_user_id TEXT PRIMARY KEY,
    encrypted_token TEXT NOT NULL,
    base_url TEXT NOT NULL,
    updated_at INTEGER NOT NULL
  );

  CREATE TABLE IF NOT EXISTS user_settings (
    github_user_id TEXT PRIMARY KEY,
    settings_json TEXT NOT NULL,
    updated_at INTEGER NOT NULL
  );

  CREATE INDEX IF NOT EXISTS idx_sessions_user ON sessions(github_user_id);
  CREATE INDEX IF NOT EXISTS idx_sessions_expires ON sessions(expires_at);
`);

export default db;
