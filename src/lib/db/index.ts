import Database from 'better-sqlite3';
import fs from 'fs';
import path from 'path';

function getEncryptionKey(): Buffer {
  const hex = process.env.GWD_ENCRYPTION_KEY;
  if (!hex || hex.length !== 64) {
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

const schema = fs.readFileSync(path.join(process.cwd(), 'src/lib/db/schema.sql'), 'utf8');
db.exec(schema);

export default db;
