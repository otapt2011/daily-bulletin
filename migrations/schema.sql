-- migrations/schema.sql
-- Complete SQLite schema for Cloudflare D1
-- Run this SQL in your D1 database (for example via the D1 REST API or your migration tooling).

PRAGMA foreign_keys = ON;

BEGIN TRANSACTION;

-- Table to track applied migrations (optional but useful)
CREATE TABLE IF NOT EXISTS migrations (
  version TEXT PRIMARY KEY,
  description TEXT,
  applied_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Users table: admin users, password_hash must be a bcrypt hash
CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  username TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  last_login TEXT
);

-- Articles table
-- id is a TEXT primary key so caller can use UUIDs or custom IDs.
CREATE TABLE IF NOT EXISTS articles (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  embed TEXT,
  author_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
  published_at TEXT NOT NULL DEFAULT (datetime('now')),
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT
);

-- Indexes for faster ordering/lookup
CREATE INDEX IF NOT EXISTS idx_articles_published_at ON articles (published_at DESC);
CREATE INDEX IF NOT EXISTS idx_articles_author ON articles (author_id);

-- Trigger: set updated_at on UPDATE
CREATE TRIGGER IF NOT EXISTS trg_articles_update_at
AFTER UPDATE ON articles
FOR EACH ROW
BEGIN
  UPDATE articles SET updated_at = datetime('now') WHERE rowid = NEW.rowid;
END;

-- Trigger: ensure published_at is set on INSERT (if client did not provide it)
CREATE TRIGGER IF NOT EXISTS trg_articles_insert_published_at
AFTER INSERT ON articles
FOR EACH ROW
WHEN NEW.published_at IS NULL
BEGIN
  UPDATE articles SET published_at = datetime('now') WHERE rowid = NEW.rowid;
END;

-- Optional: sample articles (IDs are textual so they remain stable)
INSERT OR REPLACE INTO articles (id, title, body, embed, published_at) VALUES
('a1', 'Local Startup Raises Seed Funding', 'A local startup announced it raised a seed round from angel investors. The company will use the funds to expand its engineering team and accelerate product development.\n\nCommunity response has been positive.', NULL, '2026-07-29T10:00:00Z'),
('a2', 'City Park Reopens After Renovation', 'After a six-month renovation, the city park has reopened to the public. The renovation included new walking paths, native plant landscaping, and improved accessibility features.', NULL, '2026-07-28T09:30:00Z'),
('a3', 'Viral Trick Shot Compilation', 'Check out this short compilation of viral trick shots from local athletes and creators. The video highlights precision and creativity in urban sports.', 'https://www.youtube.com/watch?v=dQw4w9WgXcQ', '2026-07-27T16:45:00Z'),
('a4', 'Quick Dance Clip', 'A short dance clip trending on social media showcases new choreography. It is embedded below.', 'https://www.tiktok.com/@someuser/video/7150000000000000000', '2026-07-26T14:20:00Z');

-- Placeholder for an admin user.
-- DO NOT put a plain-text password here. Replace <BCRYPT_HASH> with a bcrypt hash (see instructions below).
-- Example (commented out — remove the leading -- to apply after replacing <BCRYPT_HASH>):
-- INSERT OR REPLACE INTO users (username, password_hash) VALUES ('admin', '<BCRYPT_HASH>');

COMMIT;
