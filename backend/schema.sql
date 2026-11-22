PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS internships (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  domain TEXT NOT NULL,
  mode TEXT NOT NULL CHECK (mode IN ('Remote', 'Hybrid', 'On-site')),
  location TEXT NOT NULL,
  skills TEXT NOT NULL DEFAULT '[]',
  openings INTEGER NOT NULL DEFAULT 1 CHECK (openings > 0),
  duration_weeks INTEGER CHECK (duration_weeks IS NULL OR duration_weeks > 0),
  applications_open INTEGER NOT NULL DEFAULT 1 CHECK (applications_open IN (0, 1)),
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS applications (
  id TEXT PRIMARY KEY,
  internship_id TEXT NOT NULL REFERENCES internships(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT,
  cover_note TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
