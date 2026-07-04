import crypto from 'crypto';
import db from './index';

const SESSION_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours

export function createSession(githubUserId: string): string {
  const id = crypto.randomUUID();
  const now = Date.now();
  db.prepare(
    'INSERT INTO sessions (id, github_user_id, created_at, expires_at) VALUES (?, ?, ?, ?)'
  ).run(id, githubUserId, now, now + SESSION_TTL_MS);
  return id;
}

export function validateSession(sessionId: string): string | null {
  const row = db.prepare(
    'SELECT github_user_id, expires_at FROM sessions WHERE id = ?'
  ).get(sessionId) as { github_user_id: string; expires_at: number } | undefined;

  if (!row) return null;

  if (Date.now() > row.expires_at) {
    db.prepare('DELETE FROM sessions WHERE id = ?').run(sessionId);
    return null;
  }

  return row.github_user_id;
}

export function deleteSession(sessionId: string): void {
  db.prepare('DELETE FROM sessions WHERE id = ?').run(sessionId);
}
