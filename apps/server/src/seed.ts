import { nanoid } from 'nanoid';
import bcrypt from 'bcryptjs';
import { db } from './db.js';

const gifts = [
  { id: 'heart', name: 'Heart', name_ja: 'ハート', icon: '❤️', points_cost: 10, animation: 'float', category: 'standard' },
  { id: 'star', name: 'Star', name_ja: 'スター', icon: '⭐', points_cost: 50, animation: 'burst', category: 'standard' },
  { id: 'rose', name: 'Rose', name_ja: 'バラ', icon: '🌹', points_cost: 100, animation: 'float', category: 'standard' },
  { id: 'fire', name: 'Fire', name_ja: 'ファイヤー', icon: '🔥', points_cost: 200, animation: 'burst', category: 'standard' },
  { id: 'diamond', name: 'Diamond', name_ja: 'ダイヤ', icon: '💎', points_cost: 500, animation: 'sparkle', category: 'premium' },
  { id: 'crown', name: 'Crown', name_ja: 'クラウン', icon: '👑', points_cost: 1000, animation: 'sparkle', category: 'premium' },
  { id: 'rocket', name: 'Rocket', name_ja: 'ロケット', icon: '🚀', points_cost: 2000, animation: 'launch', category: 'premium' },
  { id: 'rainbow', name: 'Rainbow', name_ja: 'レインボー', icon: '🌈', points_cost: 5000, animation: 'rainbow', category: 'legendary' },
];

const streamers = [
  {
    username: 'sakura_live',
    email: 'sakura@livenova.demo',
    display_name: 'さくら 🌸',
    bio: '毎日21時からトーク配信！ゲーム・雑談・コラボ歓迎',
    role: 'streamer',
    region: 'JP',
    points: 50000,
    is_verified: 1,
  },
  {
    username: 'neon_beats',
    email: 'neon@livenova.demo',
    display_name: 'Neon Beats',
    bio: 'DJ & Music Producer | Live sets every weekend',
    role: 'streamer',
    region: 'US',
    points: 35000,
    is_verified: 1,
  },
  {
    username: 'kaito_stream',
    email: 'kaito@livenova.demo',
    display_name: 'カイト',
    bio: 'FPSゲーム実況 | 初心者歓迎 | 一緒にプレイしよう',
    role: 'streamer',
    region: 'JP',
    points: 28000,
    is_verified: 0,
  },
  {
    username: 'luna_nh',
    email: 'luna@livenova.demo',
    display_name: 'Luna ✨',
    bio: 'Premium talk & chill streams | Multi-language EN/JP',
    role: 'streamer',
    region: 'JP',
    points: 42000,
    is_verified: 1,
  },
];

const demoStreams = [
  {
    streamer: 'sakura_live',
    title: '夜の雑談ライブ 🌙 みんなで語ろう',
    description: '今日のトピック：最近ハマってるアニメ・ゲームについて語り合いましょう！ギフトでリクエストも受付中。',
    category: 'talk',
    is_live: 1,
    price_per_minute: 0,
    tags: ['雑談', 'アニメ', '初心者歓迎'],
  },
  {
    streamer: 'neon_beats',
    title: 'Weekend DJ Set — Deep House Mix',
    description: 'Live DJ set featuring the latest deep house tracks. Request your favorite songs in chat!',
    category: 'music',
    is_live: 1,
    price_per_minute: 0,
    tags: ['DJ', 'House', 'Music'],
  },
  {
    streamer: 'kaito_stream',
    title: '【FPS】ランクマッチ配信 — 一緒にプレイ募集',
    description: 'Viewer参加型ランクマッチ！コメントで参加希望をどうぞ。',
    category: 'gaming',
    is_live: 1,
    price_per_minute: 0,
    tags: ['FPS', 'ゲーム', '参加型'],
  },
  {
    streamer: 'luna_nh',
    title: 'Premium Night Talk — 特別配信 ✨',
    description: 'Premium members only content. Multi-angle camera support. Tips unlock special interactions.',
    category: 'premium',
    is_live: 0,
    price_per_minute: 70,
    scheduled_at: new Date(Date.now() + 3600000).toISOString(),
    tags: ['Premium', 'Talk', 'Multi-angle'],
  },
  {
    streamer: 'sakura_live',
    title: 'コラボ配信 — ゲストと野球拳トーク 🎲',
    description: 'ゲストと一緒に心理戦トーク！ギフトでゲームに参加しよう。',
    category: 'talk',
    is_live: 0,
    price_per_minute: 50,
    scheduled_at: new Date(Date.now() + 86400000).toISOString(),
    tags: ['コラボ', 'トーク', 'イベント'],
  },
];

export function seedDatabase() {
  const giftCount = db.prepare('SELECT COUNT(*) as c FROM gifts').get() as { c: number };
  if (giftCount.c === 0) {
    const insertGift = db.prepare(
      'INSERT INTO gifts (id, name, name_ja, icon, points_cost, animation, category) VALUES (?, ?, ?, ?, ?, ?, ?)'
    );
    for (const g of gifts) {
      insertGift.run(g.id, g.name, g.name_ja, g.icon, g.points_cost, g.animation, g.category);
    }
  }

  const userCount = db.prepare('SELECT COUNT(*) as c FROM users').get() as { c: number };
  if (userCount.c === 0) {
    const insertUser = db.prepare(`
      INSERT INTO users (id, username, email, password_hash, display_name, bio, role, region, points, is_verified, followers_count)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const passwordHash = bcrypt.hashSync('demo1234', 10);
    const streamerIds: Record<string, string> = {};

    // Demo viewer account
    const viewerId = nanoid();
    insertUser.run(viewerId, 'demo_viewer', 'viewer@livenova.demo', passwordHash, 'Demo Viewer', 'Demo account for testing', 'viewer', 'JP', 10000, 0, 0);

    for (const s of streamers) {
      const id = nanoid();
      streamerIds[s.username] = id;
      insertUser.run(id, s.username, s.email, passwordHash, s.display_name, s.bio, s.role, s.region, s.points, s.is_verified, Math.floor(Math.random() * 5000) + 500);
    }

    const insertStream = db.prepare(`
      INSERT INTO streams (id, streamer_id, title, description, category, is_live, price_per_minute, scheduled_at, started_at, viewer_count, peak_viewers, total_tips, tags)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    for (const stream of demoStreams) {
      const streamerId = streamerIds[stream.streamer];
      if (!streamerId) continue;
      insertStream.run(
        nanoid(),
        streamerId,
        stream.title,
        stream.description,
        stream.category,
        stream.is_live,
        stream.price_per_minute,
        stream.scheduled_at || null,
        stream.is_live ? new Date().toISOString() : null,
        stream.is_live ? Math.floor(Math.random() * 500) + 50 : 0,
        stream.is_live ? Math.floor(Math.random() * 800) + 100 : 0,
        Math.floor(Math.random() * 10000),
        JSON.stringify(stream.tags)
      );
    }

    // Add some follows
    const insertFollow = db.prepare('INSERT INTO follows (follower_id, streamer_id) VALUES (?, ?)');
    for (const sid of Object.values(streamerIds)) {
      insertFollow.run(viewerId, sid);
    }

    console.log('✅ Database seeded with demo data');
    console.log('   Demo login: demo_viewer / demo1234');
    console.log('   Streamer login: sakura_live / demo1234');
  }
}
