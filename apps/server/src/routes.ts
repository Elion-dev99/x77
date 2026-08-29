import { Router, type Request, type Response, type NextFunction } from 'express';
import { nanoid } from 'nanoid';
import { db, type Stream, type User } from './db.js';
import {
  createToken,
  verifyToken,
  hashPassword,
  verifyPassword,
  sanitizeUser,
  getUserById,
  getUserByUsername,
  deductPoints,
  addPoints,
} from './auth.js';

export const apiRouter = Router();

function authMiddleware(req: Request, res: Response, next: NextFunction) {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }
  const payload = verifyToken(header.slice(7));
  if (!payload) {
    res.status(401).json({ error: 'Invalid token' });
    return;
  }
  const user = getUserById(payload.userId);
  if (!user) {
    res.status(401).json({ error: 'User not found' });
    return;
  }
  (req as Request & { user: User }).user = user;
  next();
}

function optionalAuth(req: Request, _res: Response, next: NextFunction) {
  const header = req.headers.authorization;
  if (header?.startsWith('Bearer ')) {
    const payload = verifyToken(header.slice(7));
    if (payload) {
      const user = getUserById(payload.userId);
      if (user) (req as Request & { user: User }).user = user;
    }
  }
  next();
}

// Auth
apiRouter.post('/auth/register', (req, res) => {
  const { username, email, password, display_name, role } = req.body;
  if (!username || !email || !password || !display_name) {
    res.status(400).json({ error: 'Missing required fields' });
    return;
  }
  if (getUserByUsername(username)) {
    res.status(409).json({ error: 'Username already taken' });
    return;
  }
  const id = nanoid();
  db.prepare(`
    INSERT INTO users (id, username, email, password_hash, display_name, role)
    VALUES (?, ?, ?, ?, ?, ?)
  `).run(id, username, email, hashPassword(password), display_name, role === 'streamer' ? 'streamer' : 'viewer');

  const user = getUserById(id)!;
  res.status(201).json({ user: sanitizeUser(user), token: createToken(id) });
});

apiRouter.post('/auth/login', (req, res) => {
  const { username, password } = req.body;
  const user = getUserByUsername(username);
  if (!user || !verifyPassword(password, user.password_hash)) {
    res.status(401).json({ error: 'Invalid credentials' });
    return;
  }
  res.json({ user: sanitizeUser(user), token: createToken(user.id) });
});

apiRouter.get('/auth/me', authMiddleware, (req, res) => {
  const user = (req as Request & { user: User }).user;
  res.json({ user: sanitizeUser(user) });
});

// Streams
apiRouter.get('/streams', optionalAuth, (req, res) => {
  const { category, live, search } = req.query;
  let query = `
    SELECT s.*, u.display_name as streamer_name, u.username as streamer_username,
           u.avatar_url as streamer_avatar, u.is_verified as streamer_verified, u.region as streamer_region
    FROM streams s
    JOIN users u ON s.streamer_id = u.id
    WHERE 1=1
  `;
  const params: unknown[] = [];

  if (category && category !== 'all') {
    query += ' AND s.category = ?';
    params.push(category);
  }
  if (live === 'true') {
    query += ' AND s.is_live = 1';
  }
  if (search) {
    query += ' AND (s.title LIKE ? OR u.display_name LIKE ?)';
    params.push(`%${search}%`, `%${search}%`);
  }

  query += ' ORDER BY s.is_live DESC, s.viewer_count DESC, s.scheduled_at ASC';
  const streams = db.prepare(query).all(...params);
  res.json({ streams });
});

apiRouter.get('/streams/:id', optionalAuth, (req, res) => {
  const stream = db.prepare(`
    SELECT s.*, u.display_name as streamer_name, u.username as streamer_username,
           u.avatar_url as streamer_avatar, u.is_verified as streamer_verified,
           u.bio as streamer_bio, u.region as streamer_region, u.followers_count as streamer_followers
    FROM streams s
    JOIN users u ON s.streamer_id = u.id
    WHERE s.id = ?
  `).get(req.params.id);

  if (!stream) {
    res.status(404).json({ error: 'Stream not found' });
    return;
  }
  res.json({ stream });
});

apiRouter.post('/streams', authMiddleware, (req, res) => {
  const user = (req as Request & { user: User }).user;
  if (user.role !== 'streamer' && user.role !== 'admin') {
    res.status(403).json({ error: 'Only streamers can create streams' });
    return;
  }

  const { title, description, category, price_per_minute, is_private, private_password, scheduled_at, tags } = req.body;
  const id = nanoid();
  db.prepare(`
    INSERT INTO streams (id, streamer_id, title, description, category, price_per_minute, is_private, private_password, scheduled_at, tags)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    id, user.id, title, description || '', category || 'talk',
    price_per_minute || 0, is_private ? 1 : 0, private_password || null,
    scheduled_at || null, JSON.stringify(tags || [])
  );

  const stream = db.prepare('SELECT * FROM streams WHERE id = ?').get(id);
  res.status(201).json({ stream });
});

apiRouter.post('/streams/:id/go-live', authMiddleware, (req, res) => {
  const user = (req as Request & { user: User }).user;
  const stream = db.prepare('SELECT * FROM streams WHERE id = ?').get(req.params.id) as Stream | undefined;
  if (!stream) { res.status(404).json({ error: 'Not found' }); return; }
  if (stream.streamer_id !== user.id) { res.status(403).json({ error: 'Forbidden' }); return; }

  db.prepare('UPDATE streams SET is_live = 1, started_at = datetime(\'now\'), ended_at = NULL WHERE id = ?').run(req.params.id);
  res.json({ stream: db.prepare('SELECT * FROM streams WHERE id = ?').get(req.params.id) });
});

apiRouter.post('/streams/:id/end', authMiddleware, (req, res) => {
  const user = (req as Request & { user: User }).user;
  const stream = db.prepare('SELECT * FROM streams WHERE id = ?').get(req.params.id) as Stream | undefined;
  if (!stream) { res.status(404).json({ error: 'Not found' }); return; }
  if (stream.streamer_id !== user.id) { res.status(403).json({ error: 'Forbidden' }); return; }

  db.prepare('UPDATE streams SET is_live = 0, ended_at = datetime(\'now\'), viewer_count = 0 WHERE id = ?').run(req.params.id);
  res.json({ ok: true });
});

// Gifts
apiRouter.get('/gifts', (_req, res) => {
  const gifts = db.prepare('SELECT * FROM gifts ORDER BY points_cost ASC').all();
  res.json({ gifts });
});

apiRouter.post('/streams/:id/gift', authMiddleware, (req, res) => {
  const user = (req as Request & { user: User }).user;
  const { gift_id, message } = req.body;
  const stream = db.prepare('SELECT * FROM streams WHERE id = ?').get(req.params.id) as Stream | undefined;
  if (!stream) { res.status(404).json({ error: 'Not found' }); return; }

  const gift = db.prepare('SELECT * FROM gifts WHERE id = ?').get(gift_id) as { id: string; points_cost: number; name: string; icon: string } | undefined;
  if (!gift) { res.status(404).json({ error: 'Gift not found' }); return; }

  if (!deductPoints(user.id, gift.points_cost)) {
    res.status(402).json({ error: 'Insufficient points' });
    return;
  }

  addPoints(stream.streamer_id, gift.points_cost);
  const txId = nanoid();
  db.prepare('INSERT INTO gift_transactions (id, stream_id, sender_id, gift_id, points_spent, message) VALUES (?, ?, ?, ?, ?, ?)')
    .run(txId, req.params.id, user.id, gift_id, gift.points_cost, message || null);
  db.prepare('UPDATE streams SET total_tips = total_tips + ? WHERE id = ?').run(gift.points_cost, req.params.id);

  const chatId = nanoid();
  db.prepare('INSERT INTO chat_messages (id, stream_id, user_id, username, content, type) VALUES (?, ?, ?, ?, ?, ?)')
    .run(chatId, req.params.id, user.id, user.display_name, JSON.stringify({ gift_id, icon: gift.icon, name: gift.name, message }), 'gift');

  res.json({
    transaction: { id: txId, gift, points_spent: gift.points_cost },
    remaining_points: getUserById(user.id)!.points,
  });
});

// Chat history
apiRouter.get('/streams/:id/chat', (req, res) => {
  const messages = db.prepare(`
    SELECT * FROM chat_messages WHERE stream_id = ? ORDER BY created_at DESC LIMIT 100
  `).all(req.params.id);
  res.json({ messages: (messages as unknown[]).reverse() });
});

// Follow
apiRouter.post('/users/:id/follow', authMiddleware, (req, res) => {
  const user = (req as Request & { user: User }).user;
  const streamerId = req.params.id;
  if (user.id === streamerId) { res.status(400).json({ error: 'Cannot follow yourself' }); return; }

  try {
    db.prepare('INSERT INTO follows (follower_id, streamer_id) VALUES (?, ?)').run(user.id, streamerId);
    db.prepare('UPDATE users SET followers_count = followers_count + 1 WHERE id = ?').run(streamerId);
    res.json({ ok: true, following: true });
  } catch {
    res.status(409).json({ error: 'Already following' });
  }
});

apiRouter.delete('/users/:id/follow', authMiddleware, (req, res) => {
  const user = (req as Request & { user: User }).user;
  const result = db.prepare('DELETE FROM follows WHERE follower_id = ? AND streamer_id = ?').run(user.id, req.params.id);
  if (result.changes > 0) {
    db.prepare('UPDATE users SET followers_count = followers_count - 1 WHERE id = ?').run(req.params.id);
  }
  res.json({ ok: true, following: false });
});

// User profile
apiRouter.get('/users/:username', (req, res) => {
  const user = getUserByUsername(req.params.username);
  if (!user) { res.status(404).json({ error: 'Not found' }); return; }

  const streams = db.prepare('SELECT * FROM streams WHERE streamer_id = ? ORDER BY created_at DESC LIMIT 20').all(user.id);
  res.json({ user: sanitizeUser(user), streams });
});

// Points charge (demo)
apiRouter.post('/points/charge', authMiddleware, (req, res) => {
  const user = (req as Request & { user: User }).user;
  const { amount } = req.body;
  if (!amount || amount < 100 || amount > 100000) {
    res.status(400).json({ error: 'Amount must be between 100 and 100000' });
    return;
  }
  addPoints(user.id, amount);
  res.json({ points: getUserById(user.id)!.points });
});

// Two-shot
apiRouter.post('/two-shot/request', authMiddleware, (req, res) => {
  const user = (req as Request & { user: User }).user;
  const { streamer_id } = req.body;
  const id = nanoid();
  db.prepare('INSERT INTO two_shot_sessions (id, streamer_id, viewer_id, status) VALUES (?, ?, ?, ?)')
    .run(id, streamer_id, user.id, 'pending');
  res.status(201).json({ session: { id, status: 'pending' } });
});

// Analytics
apiRouter.get('/analytics', authMiddleware, (req, res) => {
  const user = (req as Request & { user: User }).user;
  const streams = db.prepare(`
    SELECT id, title, is_live, viewer_count, peak_viewers, total_tips, started_at, ended_at
    FROM streams WHERE streamer_id = ? ORDER BY created_at DESC LIMIT 50
  `).all(user.id);

  const totalTips = db.prepare(`
    SELECT COALESCE(SUM(points_spent), 0) as total FROM gift_transactions gt
    JOIN streams s ON gt.stream_id = s.id WHERE s.streamer_id = ?
  `).get(user.id) as { total: number };

  const giftBreakdown = db.prepare(`
    SELECT g.name, g.icon, COUNT(*) as count, SUM(gt.points_spent) as total
    FROM gift_transactions gt
    JOIN gifts g ON gt.gift_id = g.id
    JOIN streams s ON gt.stream_id = s.id
    WHERE s.streamer_id = ?
    GROUP BY g.id ORDER BY total DESC
  `).all(user.id);

  res.json({ streams, totalTips: totalTips.total, giftBreakdown });
});

// Report
apiRouter.post('/reports', authMiddleware, (req, res) => {
  const user = (req as Request & { user: User }).user;
  const { target_user_id, stream_id, reason } = req.body;
  db.prepare('INSERT INTO reports (id, reporter_id, target_user_id, stream_id, reason) VALUES (?, ?, ?, ?, ?)')
    .run(nanoid(), user.id, target_user_id || null, stream_id || null, reason);
  res.status(201).json({ ok: true });
});

// Stats
apiRouter.get('/stats', (_req, res) => {
  const liveCount = (db.prepare('SELECT COUNT(*) as c FROM streams WHERE is_live = 1').get() as { c: number }).c;
  const streamerCount = (db.prepare('SELECT COUNT(*) as c FROM users WHERE role = \'streamer\'').get() as { c: number }).c;
  const totalViewers = (db.prepare('SELECT COALESCE(SUM(viewer_count), 0) as c FROM streams WHERE is_live = 1').get() as { c: number }).c;
  res.json({ liveCount, streamerCount, totalViewers });
});
