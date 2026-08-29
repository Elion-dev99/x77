import { nanoid } from 'nanoid';
import { hashPassword } from './auth';
import type { Env } from './types';

const streamers = [
  { username: 'sakura_live', email: 'sakura@livenova.demo', display_name: 'さくら 🌸', bio: '毎日21時からトーク配信！', role: 'streamer', region: 'JP', points: 50000, is_verified: 1 },
  { username: 'neon_beats', email: 'neon@livenova.demo', display_name: 'Neon Beats', bio: 'DJ & Music Producer', role: 'streamer', region: 'US', points: 35000, is_verified: 1 },
  { username: 'kaito_stream', email: 'kaito@livenova.demo', display_name: 'カイト', bio: 'FPSゲーム実況', role: 'streamer', region: 'JP', points: 28000, is_verified: 0 },
  { username: 'luna_nh', email: 'luna@livenova.demo', display_name: 'Luna ✨', bio: 'Premium talk streams EN/JP', role: 'streamer', region: 'JP', points: 42000, is_verified: 1 },
];

const demoStreams = [
  { streamer: 'sakura_live', title: '夜の雑談ライブ 🌙 みんなで語ろう', description: '今日のトピック：最近ハマってるアニメ・ゲームについて語り合いましょう！', category: 'talk', is_live: 1, price_per_minute: 0, tags: ['雑談', 'アニメ', '初心者歓迎'] },
  { streamer: 'neon_beats', title: 'Weekend DJ Set — Deep House Mix', description: 'Live DJ set featuring deep house tracks.', category: 'music', is_live: 1, price_per_minute: 0, tags: ['DJ', 'House', 'Music'] },
  { streamer: 'kaito_stream', title: '【FPS】ランクマッチ配信 — 一緒にプレイ募集', description: 'Viewer参加型ランクマッチ！', category: 'gaming', is_live: 1, price_per_minute: 0, tags: ['FPS', 'ゲーム', '参加型'] },
  { streamer: 'luna_nh', title: 'Premium Night Talk — 特別配信 ✨', description: 'Premium members content.', category: 'premium', is_live: 0, price_per_minute: 70, tags: ['Premium', 'Talk'] },
  { streamer: 'sakura_live', title: 'コラボ配信 — ゲストと野球拳トーク 🎲', description: 'ギフトでゲームに参加しよう。', category: 'talk', is_live: 0, price_per_minute: 50, tags: ['コラボ', 'トーク'] },
];

export async function seedIfEmpty(env: Env): Promise<boolean> {
  const count = await env.DB.prepare('SELECT COUNT(*) as c FROM users').first<{ c: number }>();
  if (count && count.c > 0) return false;

  const passwordHash = await hashPassword('demo1234');
  const streamerIds: Record<string, string> = {};

  const viewerId = nanoid();
  await env.DB.prepare(`
    INSERT INTO users (id, username, email, password_hash, display_name, bio, role, region, points, is_verified, followers_count)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).bind(viewerId, 'demo_viewer', 'viewer@livenova.demo', passwordHash, 'Demo Viewer', 'Demo account', 'viewer', 'JP', 10000, 0, 0).run();

  for (const s of streamers) {
    const id = nanoid();
    streamerIds[s.username] = id;
    await env.DB.prepare(`
      INSERT INTO users (id, username, email, password_hash, display_name, bio, role, region, points, is_verified, followers_count)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(id, s.username, s.email, passwordHash, s.display_name, s.bio, s.role, s.region, s.points, s.is_verified, Math.floor(Math.random() * 5000) + 500).run();
  }

  for (const stream of demoStreams) {
    const streamerId = streamerIds[stream.streamer];
    if (!streamerId) continue;
    const scheduledAt = stream.is_live ? null : new Date(Date.now() + 86400000).toISOString();
    await env.DB.prepare(`
      INSERT INTO streams (id, streamer_id, title, description, category, is_live, price_per_minute, scheduled_at, started_at, viewer_count, peak_viewers, total_tips, tags)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(
      nanoid(), streamerId, stream.title, stream.description, stream.category,
      stream.is_live, stream.price_per_minute, scheduledAt,
      stream.is_live ? new Date().toISOString() : null,
      stream.is_live ? Math.floor(Math.random() * 500) + 50 : 0,
      stream.is_live ? Math.floor(Math.random() * 800) + 100 : 0,
      Math.floor(Math.random() * 10000),
      JSON.stringify(stream.tags),
    ).run();
  }

  for (const sid of Object.values(streamerIds)) {
    await env.DB.prepare('INSERT INTO follows (follower_id, streamer_id) VALUES (?, ?)').bind(viewerId, sid).run();
  }

  return true;
}
