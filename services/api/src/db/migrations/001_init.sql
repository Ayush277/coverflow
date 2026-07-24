-- CoverFlow core schema (SQLite dev / mirrors infra/postgres for prod)
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  email TEXT NOT NULL UNIQUE,
  password_hash TEXT,
  name TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'CUSTOMER' CHECK (role IN ('CUSTOMER','ADMIN','SUPPORT')),
  avatar_color TEXT NOT NULL DEFAULT '#818CF8',
  google_id TEXT,
  email_verified INTEGER NOT NULL DEFAULT 0,
  preferences TEXT NOT NULL DEFAULT '{}',
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS sessions (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  refresh_token_hash TEXT NOT NULL,
  user_agent TEXT,
  expires_at TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS cards (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  tier TEXT NOT NULL CHECK (tier IN ('PLATINUM','GOLD','GREEN')),
  last4 TEXT NOT NULL,
  network TEXT NOT NULL DEFAULT 'AMEX',
  currency TEXT NOT NULL DEFAULT 'INR',
  status TEXT NOT NULL DEFAULT 'ACTIVE',
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS transactions (
  id TEXT PRIMARY KEY,
  card_id TEXT NOT NULL REFERENCES cards(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  merchant TEXT NOT NULL,
  merchant_category TEXT NOT NULL,
  description TEXT NOT NULL,
  amount REAL NOT NULL,
  currency TEXT NOT NULL DEFAULT 'INR',
  country TEXT NOT NULL DEFAULT 'IN',
  occurred_at TEXT NOT NULL,
  source TEXT NOT NULL DEFAULT 'STRIPE_ISSUING_MOCK',
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_txn_user ON transactions(user_id, occurred_at DESC);

-- Benefit Knowledge Engine: configurable, versioned rules (no hardcoding)
CREATE TABLE IF NOT EXISTS benefit_rules (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  benefit_type TEXT NOT NULL,
  description TEXT NOT NULL,
  card_tiers TEXT NOT NULL,            -- JSON array
  categories TEXT NOT NULL,            -- JSON array ("*" = all)
  countries TEXT NOT NULL,             -- JSON array ("*" = all)
  min_amount REAL NOT NULL DEFAULT 0,
  max_amount REAL,
  coverage_days INTEGER NOT NULL,
  coverage_limit REAL NOT NULL,
  claim_window_days INTEGER NOT NULL,
  decision TEXT NOT NULL DEFAULT 'AUTO' CHECK (decision IN ('AUTO','REMINDER','MANUAL')),
  exclusions TEXT NOT NULL DEFAULT '[]',
  version INTEGER NOT NULL DEFAULT 1,
  active INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Activated protections (the Benefit Wallet)
CREATE TABLE IF NOT EXISTS benefits (
  id TEXT PRIMARY KEY,
  transaction_id TEXT NOT NULL REFERENCES transactions(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  rule_id TEXT NOT NULL REFERENCES benefit_rules(id),
  benefit_type TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE','EXPIRING','EXPIRED','CLAIMED','PENDING_ACTIVATION')),
  decision TEXT NOT NULL,
  coverage_start TEXT NOT NULL,
  coverage_end TEXT NOT NULL,
  claim_deadline TEXT NOT NULL,
  coverage_limit REAL NOT NULL,
  decision_trace TEXT NOT NULL DEFAULT '[]',   -- explainable trace of rule evaluation
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_benefit_user ON benefits(user_id, status);
CREATE UNIQUE INDEX IF NOT EXISTS idx_benefit_txn_rule ON benefits(transaction_id, rule_id); -- idempotent event consumption

CREATE TABLE IF NOT EXISTS timeline_events (
  id TEXT PRIMARY KEY,
  benefit_id TEXT NOT NULL REFERENCES benefits(id) ON DELETE CASCADE,
  label TEXT NOT NULL,
  kind TEXT NOT NULL,
  at TEXT NOT NULL,
  meta TEXT NOT NULL DEFAULT '{}'
);

CREATE TABLE IF NOT EXISTS receipts (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  transaction_id TEXT REFERENCES transactions(id) ON DELETE SET NULL,
  file_name TEXT NOT NULL,
  file_hash TEXT NOT NULL,
  source TEXT NOT NULL DEFAULT 'UPLOAD',
  merchant TEXT, invoice_number TEXT, amount REAL, purchase_date TEXT,
  serial_number TEXT, items TEXT NOT NULL DEFAULT '[]',
  ocr_confidence REAL NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'PARSED',
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS claims (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  benefit_id TEXT NOT NULL REFERENCES benefits(id) ON DELETE CASCADE,
  claim_type TEXT NOT NULL,
  incident_description TEXT NOT NULL,
  ai_summary TEXT,
  confidence REAL NOT NULL DEFAULT 0,
  amount_requested REAL NOT NULL,
  status TEXT NOT NULL DEFAULT 'DRAFT' CHECK (status IN ('DRAFT','SUBMITTED','IN_REVIEW','APPROVED','REJECTED','WITHDRAWN','PAID')),
  fraud_score REAL NOT NULL DEFAULT 0,
  fraud_flags TEXT NOT NULL DEFAULT '[]',
  documents TEXT NOT NULL DEFAULT '[]',
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_claims_user ON claims(user_id);

CREATE TABLE IF NOT EXISTS claim_events (
  id TEXT PRIMARY KEY,
  claim_id TEXT NOT NULL REFERENCES claims(id) ON DELETE CASCADE,
  actor TEXT NOT NULL,
  action TEXT NOT NULL,
  note TEXT,
  at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS notifications (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  kind TEXT NOT NULL DEFAULT 'INFO',
  priority TEXT NOT NULL DEFAULT 'NORMAL' CHECK (priority IN ('LOW','NORMAL','HIGH','URGENT')),
  read INTEGER NOT NULL DEFAULT 0,
  link TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_notif_user ON notifications(user_id, read);

CREATE TABLE IF NOT EXISTS fraud_logs (
  id TEXT PRIMARY KEY,
  claim_id TEXT REFERENCES claims(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL,
  score REAL NOT NULL,
  flags TEXT NOT NULL DEFAULT '[]',
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS audit_logs (
  id TEXT PRIMARY KEY,
  actor_id TEXT,
  action TEXT NOT NULL,
  entity TEXT NOT NULL,
  entity_id TEXT,
  detail TEXT NOT NULL DEFAULT '{}',
  at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Policy documents backing the RAG assistant
CREATE TABLE IF NOT EXISTS policies (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  benefit_type TEXT NOT NULL,
  content TEXT NOT NULL,
  keywords TEXT NOT NULL DEFAULT '[]'
);

CREATE TABLE IF NOT EXISTS chat_messages (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('user','assistant')),
  content TEXT NOT NULL,
  sources TEXT NOT NULL DEFAULT '[]',
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
