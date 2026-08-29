import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dataDir = path.join(__dirname, '..', 'data');
if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });
const dbPath = path.join(dataDir, 'livenova.db');

export const db = new Database(dbPath);
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

export function initDatabase() {
  db.exec(`
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
  `);
}

export interface User {
  id: string;
  username: string;
  email: string;
  display_name: string;
  avatar_url: string | null;
  bio: string;
  role: 'viewer' | 'streamer' | 'admin';
  points: number;
  followers_count: number;
  is_verified: number;
  region: string;
  created_at: string;
}

export interface Stream {
  id: string;
  streamer_id: string;
  title: string;
  description: string;
  category: string;
  thumbnail_url: string | null;
  is_live: number;
  is_private: number;
  price_per_minute: number;
  scheduled_at: string | null;
  started_at: string | null;
  ended_at: string | null;
  viewer_count: number;
  peak_viewers: number;
  total_tips: number;
  tags: string;
  created_at: string;
}

export interface Gift {
  id: string;
  name: string;
  name_ja: string;
  icon: string;
  points_cost: number;
  animation: string;
  category: string;
}
