CREATE TABLE IF NOT EXISTS notifications (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id),
  type TEXT NOT NULL CHECK(type IN ('gift', 'follow', 'two_shot', 'stream_live', 'system', 'billing')),
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  link TEXT,
  is_read INTEGER DEFAULT 0,
  created_at TEXT DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_id, is_read);

CREATE TABLE IF NOT EXISTS watch_sessions (
  id TEXT PRIMARY KEY,
  stream_id TEXT NOT NULL REFERENCES streams(id),
  user_id TEXT NOT NULL REFERENCES users(id),
  started_at TEXT DEFAULT (datetime('now')),
  last_billed_at TEXT DEFAULT (datetime('now')),
  total_points INTEGER DEFAULT 0,
  status TEXT DEFAULT 'active' CHECK(status IN ('active', 'ended'))
);

CREATE INDEX IF NOT EXISTS idx_watch_sessions ON watch_sessions(stream_id, user_id);
