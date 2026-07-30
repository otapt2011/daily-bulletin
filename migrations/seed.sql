-- migrations/seed.sql
-- Creates schema for articles and users and inserts sample articles with embed links.
-- Run this SQL against your Cloudflare D1 database (sqlite) if using direct SQL migration.

BEGIN TRANSACTION;

-- Users table (passwords stored as bcrypt hashes)
CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  username TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL
);

-- Articles table
CREATE TABLE IF NOT EXISTS articles (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  embed TEXT,
  published_at TEXT
);

-- Sample articles
INSERT OR REPLACE INTO articles (id, title, body, embed, published_at) VALUES
('a1', 'Local Startup Raises Seed Funding', 'A local startup announced it raised a seed round from angel investors. The company will use the funds to expand its engineering team and accelerate product development.\n\nCommunity response has been positive.', NULL, '2026-07-29T10:00:00Z'),
('a2', 'City Park Reopens After Renovation', 'After a six-month renovation, the city park has reopened to the public. The renovation included new walking paths, native plant landscaping, and improved accessibility features.', NULL, '2026-07-28T09:30:00Z'),
('a3', 'Viral Trick Shot Compilation', 'Check out this short compilation of viral trick shots from local athletes and creators. The video highlights precision and creativity in urban sports.', 'https://www.youtube.com/watch?v=dQw4w9WgXcQ', '2026-07-27T16:45:00Z'),
('a4', 'Quick Dance Clip', 'A short dance clip trending on social media showcases new choreography. It is embedded below.', 'https://www.tiktok.com/@someuser/video/7150000000000000000', '2026-07-26T14:20:00Z');

COMMIT;
