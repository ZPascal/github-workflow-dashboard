// Use an in-memory DB for tests — override the module before importing users.ts
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
  `);
  return {
    __esModule: true,
    default: memDb,
    encryptionKey: Buffer.from('a'.repeat(64), 'hex'),
    // expose the instance so tests can reference it
    _testDb: memDb,
  };
});

import { storeToken, getToken, getSettings, saveSettings } from '../src/lib/db/users';

// Grab the in-memory DB that was created inside the mock factory
const { _testDb: testDb } = jest.requireMock('../src/lib/db/index') as {
  _testDb: Database.Database;
};

describe('storeToken / getToken', () => {
  beforeEach(() => testDb.prepare('DELETE FROM user_tokens').run());

  it('round-trips a token', () => {
    storeToken('octocat', 'ghp_secret123', 'https://api.github.com');
    const result = getToken('octocat');
    expect(result).toEqual({ token: 'ghp_secret123', baseUrl: 'https://api.github.com' });
  });

  it('returns null for unknown user', () => {
    expect(getToken('nobody')).toBeNull();
  });

  it('upserts on second call', () => {
    storeToken('octocat', 'ghp_old', 'https://api.github.com');
    storeToken('octocat', 'ghp_new', 'https://api.github.com');
    const result = getToken('octocat');
    expect(result?.token).toBe('ghp_new');
  });

  it('stores ciphertext, not plaintext', () => {
    storeToken('octocat', 'ghp_secret123', 'https://api.github.com');
    const row = testDb.prepare('SELECT encrypted_token FROM user_tokens WHERE github_user_id = ?').get('octocat') as { encrypted_token: string };
    expect(row.encrypted_token).not.toContain('ghp_secret123');
  });
});

describe('getSettings / saveSettings', () => {
  beforeEach(() => testDb.prepare('DELETE FROM user_settings').run());

  it('returns null for unknown user', () => {
    expect(getSettings('octocat')).toBeNull();
  });

  it('round-trips settings', () => {
    saveSettings('octocat', { compactMode: true, selectedRepos: ['a/b'] });
    expect(getSettings('octocat')).toEqual({ compactMode: true, selectedRepos: ['a/b'] });
  });

  it('upserts on second call', () => {
    saveSettings('octocat', { compactMode: false });
    saveSettings('octocat', { compactMode: true });
    expect(getSettings('octocat')).toEqual({ compactMode: true });
  });
});
