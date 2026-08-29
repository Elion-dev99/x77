export interface Env {
  DB: D1Database;
  STREAM_ROOM: DurableObjectNamespace;
  ASSETS: Fetcher;
  JWT_SECRET: string;
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

export interface UserRow extends User {
  password_hash: string;
}
