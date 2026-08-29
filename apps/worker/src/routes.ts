import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { nanoid } from 'nanoid';
import type { Env, Stream, User } from './types';
import {
  createToken, hashPassword, verifyPassword, sanitizeUser,
  getUserById, getUserByUsername, deductPoints, addPoints, getAuthUser,
} from './auth';
import { seedIfEmpty } from './seed';

type AppEnv = { Bindings: Env; Variables: { user?: User } };

export function createApp() {
  const app = new Hono<AppEnv>();
  app.use('*', cors());

  app.use('/api/*', async (c, next) => {
    await seedIfEmpty(c.env);
    await next();
  });

  app.post('/api/auth/register', async (c) => {
    const { username, email, password, display_name, role } = await c.req.json();
    if (!username || !email || !password || !display_name) {
      return c.json({ error: 'Missing required fields' }, 400);
    }
    if (await getUserByUsername(c.env.DB, username)) {
      return c.json({ error: 'Username already taken' }, 409);
    }
    const id = nanoid();
    const pwHash = await hashPassword(password);
    await c.env.DB.prepare(`
      INSERT INTO users (id, username, email, password_hash, display_name, role)
      VALUES (?, ?, ?, ?, ?, ?)
    `).bind(id, username, email, pwHash, display_name, role === 'streamer' ? 'streamer' : 'viewer').run();
    const user = await getUserById(c.env.DB, id);
    const token = await createToken(id, c.env.JWT_SECRET);
    return c.json({ user: sanitizeUser(user!), token }, 201);
  });

  app.post('/api/auth/login', async (c) => {
    const { username, password } = await c.req.json();
    const user = await getUserByUsername(c.env.DB, username);
    if (!user || !(await verifyPassword(password, user.password_hash))) {
      return c.json({ error: 'Invalid credentials' }, 401);
    }
    const token = await createToken(user.id, c.env.JWT_SECRET);
    return c.json({ user: sanitizeUser(user), token });
  });

  app.get('/api/auth/me', async (c) => {
    const user = await getAuthUser(c.req.raw, c.env);
    if (!user) return c.json({ error: 'Unauthorized' }, 401);
    return c.json({ user: sanitizeUser(user) });
  });

  app.get('/api/streams', async (c) => {
    const category = c.req.query('category');
    const live = c.req.query('live');
    const search = c.req.query('search');
    let query = `
      SELECT s.*, u.display_name as streamer_name, u.username as streamer_username,
             u.avatar_url as streamer_avatar, u.is_verified as streamer_verified, u.region as streamer_region
      FROM streams s JOIN users u ON s.streamer_id = u.id WHERE 1=1
    `;
    const params: unknown[] = [];
    if (category && category !== 'all') { query += ' AND s.category = ?'; params.push(category); }
    if (live === 'true') { query += ' AND s.is_live = 1'; }
    if (search) { query += ' AND (s.title LIKE ? OR u.display_name LIKE ?)'; params.push(`%${search}%`, `%${search}%`); }
    query += ' ORDER BY s.is_live DESC, s.viewer_count DESC, s.scheduled_at ASC';
    const stmt = c.env.DB.prepare(query);
    const streams = params.length ? await stmt.bind(...params).all() : await stmt.all();
    return c.json({ streams: streams.results });
  });

  app.get('/api/streams/:id', async (c) => {
    const stream = await c.env.DB.prepare(`
      SELECT s.*, u.display_name as streamer_name, u.username as streamer_username,
             u.avatar_url as streamer_avatar, u.is_verified as streamer_verified,
             u.bio as streamer_bio, u.region as streamer_region, u.followers_count as streamer_followers
      FROM streams s JOIN users u ON s.streamer_id = u.id WHERE s.id = ?
    `).bind(c.req.param('id')).first();
    if (!stream) return c.json({ error: 'Stream not found' }, 404);
    return c.json({ stream });
  });

  app.post('/api/streams', async (c) => {
    const user = await getAuthUser(c.req.raw, c.env);
    if (!user) return c.json({ error: 'Unauthorized' }, 401);
    if (user.role !== 'streamer' && user.role !== 'admin') {
      return c.json({ error: 'Only streamers can create streams' }, 403);
    }
    const body = await c.req.json();
    const id = nanoid();
    await c.env.DB.prepare(`
      INSERT INTO streams (id, streamer_id, title, description, category, price_per_minute, is_private, private_password, scheduled_at, tags)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(
      id, user.id, body.title, body.description || '', body.category || 'talk',
      body.price_per_minute || 0, body.is_private ? 1 : 0, body.private_password || null,
      body.scheduled_at || null, JSON.stringify(body.tags || []),
    ).run();
    const stream = await c.env.DB.prepare('SELECT * FROM streams WHERE id = ?').bind(id).first();
    return c.json({ stream }, 201);
  });

  app.post('/api/streams/:id/go-live', async (c) => {
    const user = await getAuthUser(c.req.raw, c.env);
    if (!user) return c.json({ error: 'Unauthorized' }, 401);
    const stream = await c.env.DB.prepare('SELECT * FROM streams WHERE id = ?').bind(c.req.param('id')).first<Stream>();
    if (!stream) return c.json({ error: 'Not found' }, 404);
    if (stream.streamer_id !== user.id) return c.json({ error: 'Forbidden' }, 403);
    await c.env.DB.prepare(`UPDATE streams SET is_live = 1, started_at = datetime('now'), ended_at = NULL WHERE id = ?`).bind(c.req.param('id')).run();
    const updated = await c.env.DB.prepare('SELECT * FROM streams WHERE id = ?').bind(c.req.param('id')).first();
    return c.json({ stream: updated });
  });

  app.post('/api/streams/:id/end', async (c) => {
    const user = await getAuthUser(c.req.raw, c.env);
    if (!user) return c.json({ error: 'Unauthorized' }, 401);
    const stream = await c.env.DB.prepare('SELECT * FROM streams WHERE id = ?').bind(c.req.param('id')).first<Stream>();
    if (!stream) return c.json({ error: 'Not found' }, 404);
    if (stream.streamer_id !== user.id) return c.json({ error: 'Forbidden' }, 403);
    await c.env.DB.prepare(`UPDATE streams SET is_live = 0, ended_at = datetime('now'), viewer_count = 0 WHERE id = ?`).bind(c.req.param('id')).run();
    return c.json({ ok: true });
  });

  app.get('/api/gifts', async (c) => {
    const gifts = await c.env.DB.prepare('SELECT * FROM gifts ORDER BY points_cost ASC').all();
    return c.json({ gifts: gifts.results });
  });

  app.post('/api/streams/:id/gift', async (c) => {
    const user = await getAuthUser(c.req.raw, c.env);
    if (!user) return c.json({ error: 'Unauthorized' }, 401);
    const { gift_id, message } = await c.req.json();
    const streamId = c.req.param('id');
    const stream = await c.env.DB.prepare('SELECT * FROM streams WHERE id = ?').bind(streamId).first<Stream>();
    if (!stream) return c.json({ error: 'Not found' }, 404);
    const gift = await c.env.DB.prepare('SELECT * FROM gifts WHERE id = ?').bind(gift_id).first<{ id: string; points_cost: number; name: string; icon: string }>();
    if (!gift) return c.json({ error: 'Gift not found' }, 404);
    if (!(await deductPoints(c.env.DB, user.id, gift.points_cost))) {
      return c.json({ error: 'Insufficient points' }, 402);
    }
    await addPoints(c.env.DB, stream.streamer_id, gift.points_cost);
    const txId = nanoid();
    await c.env.DB.prepare('INSERT INTO gift_transactions (id, stream_id, sender_id, gift_id, points_spent, message) VALUES (?, ?, ?, ?, ?, ?)')
      .bind(txId, streamId, user.id, gift_id, gift.points_cost, message || null).run();
    await c.env.DB.prepare('UPDATE streams SET total_tips = total_tips + ? WHERE id = ?').bind(gift.points_cost, streamId).run();
    const chatId = nanoid();
    await c.env.DB.prepare('INSERT INTO chat_messages (id, stream_id, user_id, username, content, type) VALUES (?, ?, ?, ?, ?, ?)')
      .bind(chatId, streamId, user.id, user.display_name, JSON.stringify({ gift_id, icon: gift.icon, name: gift.name, message }), 'gift').run();
    const updated = await getUserById(c.env.DB, user.id);
    return c.json({ transaction: { id: txId, gift, points_spent: gift.points_cost }, remaining_points: updated!.points });
  });

  app.get('/api/streams/:id/chat', async (c) => {
    const messages = await c.env.DB.prepare('SELECT * FROM chat_messages WHERE stream_id = ? ORDER BY created_at DESC LIMIT 100')
      .bind(c.req.param('id')).all();
    return c.json({ messages: (messages.results as unknown[]).reverse() });
  });

  app.post('/api/users/:id/follow', async (c) => {
    const user = await getAuthUser(c.req.raw, c.env);
    if (!user) return c.json({ error: 'Unauthorized' }, 401);
    const streamerId = c.req.param('id');
    if (user.id === streamerId) return c.json({ error: 'Cannot follow yourself' }, 400);
    try {
      await c.env.DB.prepare('INSERT INTO follows (follower_id, streamer_id) VALUES (?, ?)').bind(user.id, streamerId).run();
      await c.env.DB.prepare('UPDATE users SET followers_count = followers_count + 1 WHERE id = ?').bind(streamerId).run();
      return c.json({ ok: true, following: true });
    } catch {
      return c.json({ error: 'Already following' }, 409);
    }
  });

  app.delete('/api/users/:id/follow', async (c) => {
    const user = await getAuthUser(c.req.raw, c.env);
    if (!user) return c.json({ error: 'Unauthorized' }, 401);
    const result = await c.env.DB.prepare('DELETE FROM follows WHERE follower_id = ? AND streamer_id = ?').bind(user.id, c.req.param('id')).run();
    if (result.meta.changes > 0) {
      await c.env.DB.prepare('UPDATE users SET followers_count = followers_count - 1 WHERE id = ?').bind(c.req.param('id')).run();
    }
    return c.json({ ok: true, following: false });
  });

  app.get('/api/users/:username', async (c) => {
    const user = await getUserByUsername(c.env.DB, c.req.param('username'));
    if (!user) return c.json({ error: 'Not found' }, 404);
    const streams = await c.env.DB.prepare('SELECT * FROM streams WHERE streamer_id = ? ORDER BY created_at DESC LIMIT 20').bind(user.id).all();
    return c.json({ user: sanitizeUser(user), streams: streams.results });
  });

  app.post('/api/points/charge', async (c) => {
    const user = await getAuthUser(c.req.raw, c.env);
    if (!user) return c.json({ error: 'Unauthorized' }, 401);
    const { amount } = await c.req.json();
    if (!amount || amount < 100 || amount > 100000) return c.json({ error: 'Amount must be between 100 and 100000' }, 400);
    await addPoints(c.env.DB, user.id, amount);
    const updated = await getUserById(c.env.DB, user.id);
    return c.json({ points: updated!.points });
  });

  app.post('/api/two-shot/request', async (c) => {
    const user = await getAuthUser(c.req.raw, c.env);
    if (!user) return c.json({ error: 'Unauthorized' }, 401);
    const { streamer_id } = await c.req.json();
    const id = nanoid();
    await c.env.DB.prepare('INSERT INTO two_shot_sessions (id, streamer_id, viewer_id, status) VALUES (?, ?, ?, ?)')
      .bind(id, streamer_id, user.id, 'pending').run();
    return c.json({ session: { id, status: 'pending' } }, 201);
  });

  app.get('/api/analytics', async (c) => {
    const user = await getAuthUser(c.req.raw, c.env);
    if (!user) return c.json({ error: 'Unauthorized' }, 401);
    const streams = await c.env.DB.prepare(`
      SELECT id, title, is_live, viewer_count, peak_viewers, total_tips, started_at, ended_at
      FROM streams WHERE streamer_id = ? ORDER BY created_at DESC LIMIT 50
    `).bind(user.id).all();
    const totalTips = await c.env.DB.prepare(`
      SELECT COALESCE(SUM(points_spent), 0) as total FROM gift_transactions gt
      JOIN streams s ON gt.stream_id = s.id WHERE s.streamer_id = ?
    `).bind(user.id).first<{ total: number }>();
    const giftBreakdown = await c.env.DB.prepare(`
      SELECT g.name, g.icon, COUNT(*) as count, SUM(gt.points_spent) as total
      FROM gift_transactions gt JOIN gifts g ON gt.gift_id = g.id
      JOIN streams s ON gt.stream_id = s.id WHERE s.streamer_id = ?
      GROUP BY g.id ORDER BY total DESC
    `).bind(user.id).all();
    return c.json({ streams: streams.results, totalTips: totalTips?.total ?? 0, giftBreakdown: giftBreakdown.results });
  });

  app.post('/api/reports', async (c) => {
    const user = await getAuthUser(c.req.raw, c.env);
    if (!user) return c.json({ error: 'Unauthorized' }, 401);
    const { target_user_id, stream_id, reason } = await c.req.json();
    await c.env.DB.prepare('INSERT INTO reports (id, reporter_id, target_user_id, stream_id, reason) VALUES (?, ?, ?, ?, ?)')
      .bind(nanoid(), user.id, target_user_id || null, stream_id || null, reason).run();
    return c.json({ ok: true }, 201);
  });

  app.get('/api/stats', async (c) => {
    const liveCount = await c.env.DB.prepare('SELECT COUNT(*) as c FROM streams WHERE is_live = 1').first<{ c: number }>();
    const streamerCount = await c.env.DB.prepare("SELECT COUNT(*) as c FROM users WHERE role = 'streamer'").first<{ c: number }>();
    const totalViewers = await c.env.DB.prepare('SELECT COALESCE(SUM(viewer_count), 0) as c FROM streams WHERE is_live = 1').first<{ c: number }>();
    return c.json({ liveCount: liveCount?.c ?? 0, streamerCount: streamerCount?.c ?? 0, totalViewers: totalViewers?.c ?? 0 });
  });

  return app;
}
