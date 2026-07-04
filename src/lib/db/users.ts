import crypto from 'crypto';
import db, { encryptionKey } from './index';

const ALGO = 'aes-256-gcm';
const IV_LEN = 12;
const TAG_LEN = 16;

function encrypt(plaintext: string): string {
  const iv = crypto.randomBytes(IV_LEN);
  const cipher = crypto.createCipheriv(ALGO, encryptionKey, iv);
  const encrypted = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
  const authTag = cipher.getAuthTag();
  return Buffer.concat([iv, authTag, encrypted]).toString('base64');
}

function decrypt(ciphertext: string): string {
  const buf = Buffer.from(ciphertext, 'base64');
  const iv = buf.subarray(0, IV_LEN);
  const authTag = buf.subarray(IV_LEN, IV_LEN + TAG_LEN);
  const encrypted = buf.subarray(IV_LEN + TAG_LEN);
  const decipher = crypto.createDecipheriv(ALGO, encryptionKey, iv);
  decipher.setAuthTag(authTag);
  return Buffer.concat([decipher.update(encrypted), decipher.final()]).toString('utf8');
}

export function storeToken(githubUserId: string, token: string, baseUrl: string): void {
  const encryptedToken = encrypt(token);
  db.prepare(`
    INSERT INTO user_tokens (github_user_id, encrypted_token, base_url, updated_at)
    VALUES (?, ?, ?, ?)
    ON CONFLICT(github_user_id) DO UPDATE SET
      encrypted_token = excluded.encrypted_token,
      base_url = excluded.base_url,
      updated_at = excluded.updated_at
  `).run(githubUserId, encryptedToken, baseUrl, Date.now());
}

export function getToken(githubUserId: string): { token: string; baseUrl: string } | null {
  const row = db.prepare(
    'SELECT encrypted_token, base_url FROM user_tokens WHERE github_user_id = ?'
  ).get(githubUserId) as { encrypted_token: string; base_url: string } | undefined;
  if (!row) return null;
  try {
    return { token: decrypt(row.encrypted_token), baseUrl: row.base_url };
  } catch {
    return null;
  }
}

export function getSettings(githubUserId: string): Record<string, unknown> | null {
  const row = db.prepare(
    'SELECT settings_json FROM user_settings WHERE github_user_id = ?'
  ).get(githubUserId) as { settings_json: string } | undefined;
  if (!row) return null;
  try {
    return JSON.parse(row.settings_json) as Record<string, unknown>;
  } catch {
    return null;
  }
}

export function saveSettings(githubUserId: string, settings: Record<string, unknown>): void {
  db.prepare(`
    INSERT INTO user_settings (github_user_id, settings_json, updated_at)
    VALUES (?, ?, ?)
    ON CONFLICT(github_user_id) DO UPDATE SET
      settings_json = excluded.settings_json,
      updated_at = excluded.updated_at
  `).run(githubUserId, JSON.stringify(settings), Date.now());
}
