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
