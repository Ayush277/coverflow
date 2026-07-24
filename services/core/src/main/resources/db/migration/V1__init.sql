-- CoverFlow production schema (PostgreSQL) — Flyway V1
-- Mirrors services/api/src/db/migrations/001_init.sql with Postgres types + pgvector.

CREATE EXTENSION IF NOT EXISTS vector;

CREATE TABLE users (
  id TEXT PRIMARY KEY,
  email TEXT NOT NULL UNIQUE,
  password_hash TEXT,
  name TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'CUSTOMER' CHECK (role IN ('CUSTOMER','ADMIN','SUPPORT')),
  avatar_color TEXT NOT NULL DEFAULT '#818CF8',
  google_id TEXT,
  email_verified BOOLEAN NOT NULL DEFAULT FALSE,
  preferences JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE sessions (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  refresh_token_hash TEXT NOT NULL,
  user_agent TEXT,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE cards (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  tier TEXT NOT NULL CHECK (tier IN ('PLATINUM','GOLD','GREEN')),
  last4 TEXT NOT NULL,
  network TEXT NOT NULL DEFAULT 'AMEX',
  currency TEXT NOT NULL DEFAULT 'INR',
  status TEXT NOT NULL DEFAULT 'ACTIVE',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE transactions (
  id TEXT PRIMARY KEY,
  card_id TEXT NOT NULL REFERENCES cards(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  merchant TEXT NOT NULL,
  merchant_category TEXT NOT NULL,
  description TEXT NOT NULL,
  amount NUMERIC(14,2) NOT NULL,
  currency TEXT NOT NULL DEFAULT 'INR',
  country TEXT NOT NULL DEFAULT 'IN',
  occurred_at TIMESTAMPTZ NOT NULL,
  source TEXT NOT NULL DEFAULT 'STRIPE_ISSUING',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_txn_user ON transactions(user_id, occurred_at DESC);

CREATE TABLE benefit_rules (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  benefit_type TEXT NOT NULL,
  description TEXT NOT NULL,
  card_tiers JSONB NOT NULL,
  categories JSONB NOT NULL,
  countries JSONB NOT NULL,
  min_amount NUMERIC(14,2) NOT NULL DEFAULT 0,
  max_amount NUMERIC(14,2),
  coverage_days INT NOT NULL,
  coverage_limit NUMERIC(14,2) NOT NULL,
  claim_window_days INT NOT NULL,
  decision TEXT NOT NULL DEFAULT 'AUTO' CHECK (decision IN ('AUTO','REMINDER','MANUAL')),
  exclusions JSONB NOT NULL DEFAULT '[]',
  version INT NOT NULL DEFAULT 1,
  active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE benefits (
  id TEXT PRIMARY KEY,
  transaction_id TEXT NOT NULL REFERENCES transactions(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  rule_id TEXT NOT NULL REFERENCES benefit_rules(id),
  benefit_type TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'ACTIVE'
    CHECK (status IN ('ACTIVE','EXPIRING','EXPIRED','CLAIMED','PENDING_ACTIVATION')),
  decision TEXT NOT NULL,
  coverage_start TIMESTAMPTZ NOT NULL,
  coverage_end TIMESTAMPTZ NOT NULL,
  claim_deadline TIMESTAMPTZ NOT NULL,
  coverage_limit NUMERIC(14,2) NOT NULL,
  decision_trace JSONB NOT NULL DEFAULT '[]',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (transaction_id, rule_id)
);
CREATE INDEX idx_benefit_user ON benefits(user_id, status);

CREATE TABLE timeline_events (
  id TEXT PRIMARY KEY,
  benefit_id TEXT NOT NULL REFERENCES benefits(id) ON DELETE CASCADE,
  label TEXT NOT NULL,
  kind TEXT NOT NULL,
  at TIMESTAMPTZ NOT NULL,
  meta JSONB NOT NULL DEFAULT '{}'
);

CREATE TABLE receipts (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  transaction_id TEXT REFERENCES transactions(id) ON DELETE SET NULL,
  file_name TEXT NOT NULL,
  file_hash TEXT NOT NULL,
  source TEXT NOT NULL DEFAULT 'UPLOAD',
  merchant TEXT,
  invoice_number TEXT,
  amount NUMERIC(14,2),
  purchase_date DATE,
  serial_number TEXT,
  items JSONB NOT NULL DEFAULT '[]',
  ocr_confidence REAL NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'PARSED',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE claims (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  benefit_id TEXT NOT NULL REFERENCES benefits(id) ON DELETE CASCADE,
  claim_type TEXT NOT NULL,
  incident_description TEXT NOT NULL,
  ai_summary TEXT,
  confidence REAL NOT NULL DEFAULT 0,
  amount_requested NUMERIC(14,2) NOT NULL,
  status TEXT NOT NULL DEFAULT 'DRAFT'
    CHECK (status IN ('DRAFT','SUBMITTED','IN_REVIEW','APPROVED','REJECTED','WITHDRAWN','PAID')),
  fraud_score REAL NOT NULL DEFAULT 0,
  fraud_flags JSONB NOT NULL DEFAULT '[]',
  documents JSONB NOT NULL DEFAULT '[]',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE claim_events (
  id TEXT PRIMARY KEY,
  claim_id TEXT NOT NULL REFERENCES claims(id) ON DELETE CASCADE,
  actor TEXT NOT NULL,
  action TEXT NOT NULL,
  note TEXT,
  at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE notifications (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  kind TEXT NOT NULL DEFAULT 'INFO',
  priority TEXT NOT NULL DEFAULT 'NORMAL' CHECK (priority IN ('LOW','NORMAL','HIGH','URGENT')),
  read BOOLEAN NOT NULL DEFAULT FALSE,
  link TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE fraud_logs (
  id TEXT PRIMARY KEY,
  claim_id TEXT REFERENCES claims(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL,
  score REAL NOT NULL,
  flags JSONB NOT NULL DEFAULT '[]',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE audit_logs (
  id TEXT PRIMARY KEY,
  actor_id TEXT,
  action TEXT NOT NULL,
  entity TEXT NOT NULL,
  entity_id TEXT,
  detail JSONB NOT NULL DEFAULT '{}',
  at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- RAG policy library with pgvector embeddings
CREATE TABLE policies (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  benefit_type TEXT NOT NULL,
  content TEXT NOT NULL,
  keywords JSONB NOT NULL DEFAULT '[]',
  embedding vector(1536)
);
CREATE INDEX idx_policies_embedding ON policies USING hnsw (embedding vector_cosine_ops);

CREATE TABLE chat_messages (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('user','assistant')),
  content TEXT NOT NULL,
  sources JSONB NOT NULL DEFAULT '[]',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
