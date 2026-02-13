-- =========================
-- PRODUCTS TABLE
-- =========================

CREATE TABLE IF NOT EXISTS products (
  id INTEGER PRIMARY KEY AUTOINCREMENT,

  category TEXT NOT NULL,           -- smartphones | laptops | earbuds
  name TEXT NOT NULL,
  price INTEGER NOT NULL DEFAULT 0,

  attrs_json TEXT NOT NULL,         -- { cam:9, gam:8, bat:7 }
  dna_json TEXT,                    -- { dominance:"...", tech_edge:"..." }

  updated_at TEXT NOT NULL DEFAULT (datetime('now')),

  UNIQUE(category, name)
);

-- Fast category filtering
CREATE INDEX IF NOT EXISTS idx_products_category
ON products(category);

-- Optional: price sorting optimization
CREATE INDEX IF NOT EXISTS idx_products_price
ON products(price);
