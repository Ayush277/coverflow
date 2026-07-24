-- Outbound email log (also powers the in-app "Email activity" view)
CREATE TABLE IF NOT EXISTS emails (
  id TEXT PRIMARY KEY,
  user_id TEXT REFERENCES users(id) ON DELETE SET NULL,
  to_address TEXT NOT NULL,
  subject TEXT NOT NULL,
  template TEXT NOT NULL,
  body_html TEXT NOT NULL,
  preview_url TEXT,
  status TEXT NOT NULL DEFAULT 'SENT',
  error TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_emails_user ON emails(user_id, created_at DESC);

-- Single-use tokens for email verification + password reset
CREATE TABLE IF NOT EXISTS auth_tokens (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token_hash TEXT NOT NULL UNIQUE,
  kind TEXT NOT NULL CHECK (kind IN ('VERIFY_EMAIL','RESET_PASSWORD')),
  expires_at TEXT NOT NULL,
  used_at TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_tokens_user ON auth_tokens(user_id, kind);

-- Public, revocable proof links for a protection (Benefit Passport sharing)
CREATE TABLE IF NOT EXISTS share_links (
  id TEXT PRIMARY KEY,
  benefit_id TEXT NOT NULL REFERENCES benefits(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  slug TEXT NOT NULL UNIQUE,
  expires_at TEXT,
  revoked INTEGER NOT NULL DEFAULT 0,
  view_count INTEGER NOT NULL DEFAULT 0,
  last_viewed_at TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_share_benefit ON share_links(benefit_id);
