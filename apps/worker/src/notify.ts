import type { Env } from './types';

export async function createNotification(
  db: D1Database,
  userId: string,
  type: string,
  title: string,
  body: string,
  link?: string,
) {
  const id = crypto.randomUUID().replace(/-/g, '').slice(0, 21);
  await db.prepare(`
    INSERT INTO notifications (id, user_id, type, title, body, link)
    VALUES (?, ?, ?, ?, ?, ?)
  `).bind(id, userId, type, title, body, link || null).run();
}

export async function broadcastStreamEnded(env: Env, streamId: string) {
  const id = env.STREAM_ROOM.idFromName('default');
  const stub = env.STREAM_ROOM.get(id);
  await stub.fetch(new Request('https://internal/broadcast', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ streamId, type: 'stream_ended' }),
  }));
}
