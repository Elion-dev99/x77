CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  username TEXT UNIQUE NOT NULL,
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  display_name TEXT NOT NULL,
  avatar_url TEXT,
  bio TEXT DEFAULT '',
  role TEXT DEFAULT 'viewer' CHECK(role IN ('viewer', 'streamer', 'admin')),
  points INTEGER DEFAULT 1000,
  followers_count INTEGER DEFAULT 0,
  is_verified INTEGER DEFAULT 0,
  region TEXT DEFAULT 'JP',
  created_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS streams (
  id TEXT PRIMARY KEY,
  streamer_id TEXT NOT NULL REFERENCES users(id),
  title TEXT NOT NULL,
  description TEXT DEFAULT '',
  category TEXT DEFAULT 'talk' CHECK(category IN ('talk', 'music', 'gaming', 'premium', 'multi_angle')),
  thumbnail_url TEXT,
  is_live INTEGER DEFAULT 0,
  is_private INTEGER DEFAULT 0,
  private_password TEXT,
  price_per_minute INTEGER DEFAULT 0,
  scheduled_at TEXT,
  started_at TEXT,
  ended_at TEXT,
  viewer_count INTEGER DEFAULT 0,
  peak_viewers INTEGER DEFAULT 0,
  total_tips INTEGER DEFAULT 0,
  tags TEXT DEFAULT '[]',
  created_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS follows (
  follower_id TEXT NOT NULL REFERENCES users(id),
  streamer_id TEXT NOT NULL REFERENCES users(id),
  created_at TEXT DEFAULT (datetime('now')),
  PRIMARY KEY (follower_id, streamer_id)
);

CREATE TABLE IF NOT EXISTS gifts (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  name_ja TEXT NOT NULL,
  icon TEXT NOT NULL,
  points_cost INTEGER NOT NULL,
  animation TEXT DEFAULT 'float',
  category TEXT DEFAULT 'standard'
);

CREATE TABLE IF NOT EXISTS gift_transactions (
  id TEXT PRIMARY KEY,
  stream_id TEXT NOT NULL REFERENCES streams(id),
  sender_id TEXT NOT NULL REFERENCES users(id),
  gift_id TEXT NOT NULL REFERENCES gifts(id),
  points_spent INTEGER NOT NULL,
  message TEXT,
  created_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS chat_messages (
  id TEXT PRIMARY KEY,
  stream_id TEXT NOT NULL REFERENCES streams(id),
  user_id TEXT NOT NULL REFERENCES users(id),
  username TEXT NOT NULL,
  content TEXT NOT NULL,
  type TEXT DEFAULT 'message' CHECK(type IN ('message', 'gift', 'system', 'tip')),
  created_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS two_shot_sessions (
  id TEXT PRIMARY KEY,
  streamer_id TEXT NOT NULL REFERENCES users(id),
  viewer_id TEXT NOT NULL REFERENCES users(id),
  price_per_minute INTEGER DEFAULT 100,
  status TEXT DEFAULT 'pending' CHECK(status IN ('pending', 'active', 'ended')),
  started_at TEXT,
  ended_at TEXT,
  total_points INTEGER DEFAULT 0,
  created_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS reports (
  id TEXT PRIMARY KEY,
  reporter_id TEXT NOT NULL REFERENCES users(id),
  target_user_id TEXT,
  stream_id TEXT,
  reason TEXT NOT NULL,
  status TEXT DEFAULT 'pending',
  created_at TEXT DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_streams_live ON streams(is_live);
CREATE INDEX IF NOT EXISTS idx_streams_streamer ON streams(streamer_id);
CREATE INDEX IF NOT EXISTS idx_chat_stream ON chat_messages(stream_id);

INSERT OR IGNORE INTO gifts (id, name, name_ja, icon, points_cost, animation, category) VALUES
  ('heart', 'Heart', 'ハート', '❤️', 10, 'float', 'standard'),
  ('star', 'Star', 'スター', '⭐', 50, 'burst', 'standard'),
  ('rose', 'Rose', 'バラ', '🌹', 100, 'float', 'standard'),
  ('fire', 'Fire', 'ファイヤー', '🔥', 200, 'burst', 'standard'),
  ('diamond', 'Diamond', 'ダイヤ', '💎', 500, 'sparkle', 'premium'),
  ('crown', 'Crown', 'クラウン', '👑', 1000, 'sparkle', 'premium'),
  ('rocket', 'Rocket', 'ロケット', '🚀', 2000, 'launch', 'premium'),
  ('rainbow', 'Rainbow', 'レインボー', '🌈', 5000, 'rainbow', 'legendary');
