// Use an in-memory DB for tests — override the module before importing sessions.ts
process.env.GWD_ENCRYPTION_KEY = 'a'.repeat(64); // 32 bytes of 0xaa

import Database from 'better-sqlite3';

// jest.mock is hoisted before any module-level code, so we cannot reference
// a variable declared here from within the factory. Instead, we create the
// DB inside the factory and expose it so tests can access it via requireMock.
jest.mock('../src/lib/db/index', () => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const Db = require('better-sqlite3');
  const memDb = new Db(':memory:');
  memDb.exec(`
    CREATE TABLE IF NOT EXISTS sessions (
      id TEXT PRIMARY KEY,
      github_user_id TEXT NOT NULL,
      created_at INTEGER NOT NULL,
      expires_at INTEGER NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_sessions_expires ON sessions(expires_at);
  `);
  return {
    __esModule: true,
    default: memDb,
    encryptionKey: Buffer.from('a'.repeat(64), 'hex'),
    // expose the instance so tests can reference it
    _testDb: memDb,
  };
});

import { createSession, validateSession, deleteSession } from '../src/lib/db/sessions';

// Grab the in-memory DB that was created inside the mock factory
const { _testDb: testDb } = jest.requireMock('../src/lib/db/index') as {
  _testDb: Database.Database;
};

describe('createSession', () => {
  beforeEach(() => testDb.prepare('DELETE FROM sessions').run());

  it('returns a UUID-shaped string', () => {
    const id = createSession('octocat');
    expect(id).toMatch(/^[0-9a-f-]{36}$/);
  });

  it('inserts a row with the correct user', () => {
    const id = createSession('octocat');
    const row = testDb.prepare('SELECT * FROM sessions WHERE id = ?').get(id) as { github_user_id: string; expires_at: number };
    expect(row.github_user_id).toBe('octocat');
    expect(row.expires_at).toBeGreaterThan(Date.now());
  });
});

describe('validateSession', () => {
  beforeEach(() => testDb.prepare('DELETE FROM sessions').run());

  it('returns github_user_id for a valid session', () => {
    const id = createSession('octocat');
    expect(validateSession(id)).toBe('octocat');
  });

  it('returns null for unknown session', () => {
    expect(validateSession('nonexistent')).toBeNull();
  });

  it('returns null and deletes an expired session', () => {
    const past = Date.now() - 1000;
    testDb.prepare(
      'INSERT INTO sessions (id, github_user_id, created_at, expires_at) VALUES (?, ?, ?, ?)'
    ).run('expired-id', 'octocat', past - 86400000, past);

    expect(validateSession('expired-id')).toBeNull();
    const row = testDb.prepare('SELECT id FROM sessions WHERE id = ?').get('expired-id');
    expect(row).toBeUndefined();
  });
});

describe('deleteSession', () => {
  beforeEach(() => testDb.prepare('DELETE FROM sessions').run());

  it('removes the session row', () => {
    const id = createSession('octocat');
    deleteSession(id);
    const row = testDb.prepare('SELECT id FROM sessions WHERE id = ?').get(id);
    expect(row).toBeUndefined();
  });

  it('is idempotent for nonexistent sessions', () => {
    expect(() => deleteSession('ghost')).not.toThrow();
  });
});
