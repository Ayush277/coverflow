-- Merchant catalog: replaces the hardcoded simulator pool with real data.
-- Both the storefront checkout and the transaction simulator read from this table.
CREATE TABLE IF NOT EXISTS products (
  id TEXT PRIMARY KEY,
  sku TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  description TEXT NOT NULL,
  merchant TEXT NOT NULL,
  category TEXT NOT NULL,
  price REAL NOT NULL,
  currency TEXT NOT NULL DEFAULT 'INR',
  country TEXT NOT NULL DEFAULT 'IN',
  emoji TEXT NOT NULL DEFAULT '📦',
  accent TEXT NOT NULL DEFAULT '#818CF8',
  warranty_months INTEGER NOT NULL DEFAULT 12,
  active INTEGER NOT NULL DEFAULT 1
);
CREATE INDEX IF NOT EXISTS idx_products_merchant ON products(merchant);

-- Orders placed through the CoverFlow demo storefront
CREATE TABLE IF NOT EXISTS orders (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  card_id TEXT NOT NULL REFERENCES cards(id) ON DELETE CASCADE,
  total REAL NOT NULL,
  currency TEXT NOT NULL DEFAULT 'INR',
  status TEXT NOT NULL DEFAULT 'AUTHORIZED',
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS order_items (
  id TEXT PRIMARY KEY,
  order_id TEXT NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  product_id TEXT NOT NULL REFERENCES products(id),
  transaction_id TEXT REFERENCES transactions(id) ON DELETE SET NULL,
  quantity INTEGER NOT NULL DEFAULT 1,
  unit_price REAL NOT NULL
);

-- Default card for one-tap checkout
ALTER TABLE cards ADD COLUMN is_default INTEGER NOT NULL DEFAULT 0;
