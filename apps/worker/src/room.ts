import { DurableObject } from 'cloudflare:workers';
import { nanoid } from 'nanoid';
import type { Env } from './types';
import { verifyToken, getUserById } from './auth';

interface ClientMeta {
  userId?: string;
  username?: string;
  streamId?: string;
  role?: 'viewer' | 'broadcaster';
}

interface RoomState {
  broadcaster: WebSocket | null;
  broadcasterId: string | null;
}

export class StreamRoom extends DurableObject<Env> {
  private sessions = new Map<WebSocket, ClientMeta>();
  private rooms = new Map<string, RoomState>();

  async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url);
    if (url.pathname === '/broadcast' && request.method === 'POST') {
      const { streamId, type } = await request.json() as { streamId: string; type: string };
      if (type === 'stream_ended') {
        this.broadcastToRoom(streamId, { type: 'stream_ended' });
      }
      return new Response(JSON.stringify({ ok: true }), { headers: { 'Content-Type': 'application/json' } });
    }

    if (request.headers.get('Upgrade') !== 'websocket') {
      return new Response('Expected WebSocket', { status: 426 });
    }
    const pair = new WebSocketPair();
    const [client, server] = [pair[0], pair[1]];
    this.ctx.acceptWebSocket(server);
    return new Response(null, { status: 101, webSocket: client });
  }

  async webSocketMessage(ws: WebSocket, message: string | ArrayBuffer) {
    try {
      const msg = JSON.parse(typeof message === 'string' ? message : new TextDecoder().decode(message));
      await this.handleMessage(ws, msg);
    } catch {
      ws.send(JSON.stringify({ type: 'error', message: 'Invalid message' }));
    }
  }

  async webSocketClose(ws: WebSocket) {
    await this.handleDisconnect(ws);
  }

  private getRoom(streamId: string): RoomState {
    if (!this.rooms.has(streamId)) {
      this.rooms.set(streamId, { broadcaster: null, broadcasterId: null });
    }
    return this.rooms.get(streamId)!;
  }

  private getViewers(streamId: string): WebSocket[] {
    const viewers: WebSocket[] = [];
    for (const [ws, meta] of this.sessions) {
      if (meta.streamId === streamId && meta.role === 'viewer') viewers.push(ws);
    }
    return viewers;
  }

  private getViewerCount(streamId: string): number {
    return this.getViewers(streamId).length;
  }

  private async handleMessage(ws: WebSocket, msg: Record<string, unknown>) {
    const meta = this.sessions.get(ws) || {};

    switch (msg.type) {
      case 'auth': {
        const payload = await verifyToken(msg.token as string, this.env.JWT_SECRET);
        if (!payload) { ws.send(JSON.stringify({ type: 'error', message: 'Auth failed' })); return; }
        const user = await getUserById(this.env.DB, payload.userId);
        if (!user) { ws.send(JSON.stringify({ type: 'error', message: 'User not found' })); return; }
        meta.userId = user.id;
        meta.username = user.display_name;
        this.sessions.set(ws, meta);
        ws.send(JSON.stringify({ type: 'auth_ok', user: { id: user.id, display_name: user.display_name } }));
        break;
      }

      case 'join': {
        const streamId = msg.streamId as string;
        const role = (msg.role as 'viewer' | 'broadcaster') || 'viewer';
        meta.streamId = streamId;
        meta.role = role;
        this.sessions.set(ws, meta);
        const room = this.getRoom(streamId);

        if (role === 'broadcaster') {
          room.broadcaster = ws;
          room.broadcasterId = meta.userId || null;
          ws.send(JSON.stringify({ type: 'joined', role: 'broadcaster', viewerCount: this.getViewerCount(streamId) }));
        } else {
          ws.send(JSON.stringify({ type: 'joined', role: 'viewer', viewerCount: this.getViewerCount(streamId) }));
          await this.updateViewerCount(streamId);
          if (room.broadcaster) {
            room.broadcaster.send(JSON.stringify({ type: 'viewer_joined', viewerId: meta.userId || nanoid() }));
          }
        }
        break;
      }

      case 'chat': {
        if (!meta.streamId || !meta.userId) return;
        const content = (msg.content as string)?.slice(0, 500);
        if (!content?.trim()) return;
        const id = nanoid();
        await this.env.DB.prepare('INSERT INTO chat_messages (id, stream_id, user_id, username, content, type) VALUES (?, ?, ?, ?, ?, ?)')
          .bind(id, meta.streamId, meta.userId, meta.username || 'Anonymous', content, 'message').run();
        this.broadcastToRoom(meta.streamId, {
          type: 'chat', id, userId: meta.userId, username: meta.username, content,
          timestamp: new Date().toISOString(),
        });
        break;
      }

      case 'gift': {
        if (!meta.streamId) return;
        this.broadcastToRoom(meta.streamId, { type: 'gift_animation', gift: msg.gift, username: meta.username, message: msg.message });
        break;
      }

      case 'reaction': {
        if (!meta.streamId) return;
        this.broadcastToRoom(meta.streamId, { type: 'reaction', emoji: msg.emoji, username: meta.username });
        break;
      }

      case 'offer': {
        if (!meta.streamId) return;
        const room = this.getRoom(meta.streamId);
        const targetViewerId = msg.targetViewerId as string | undefined;
        const payload = JSON.stringify({ type: 'offer', offer: msg.offer, broadcasterId: meta.userId });
        if (targetViewerId) {
          for (const [socket, clientMeta] of this.sessions) {
            if (clientMeta.userId === targetViewerId && clientMeta.streamId === meta.streamId) socket.send(payload);
          }
        } else {
          for (const viewer of this.getViewers(meta.streamId)) viewer.send(payload);
        }
        break;
      }

      case 'answer': {
        if (!meta.streamId) return;
        const room = this.getRoom(meta.streamId);
        if (room.broadcaster) {
          room.broadcaster.send(JSON.stringify({ type: 'answer', answer: msg.answer, viewerId: meta.userId }));
        }
        break;
      }

      case 'ice_candidate': {
        if (!meta.streamId) return;
        const room = this.getRoom(meta.streamId);
        if (meta.role === 'broadcaster') {
          const targetViewerId = msg.viewerId as string;
          for (const [socket, clientMeta] of this.sessions) {
            if (clientMeta.userId === targetViewerId && clientMeta.streamId === meta.streamId) {
              socket.send(JSON.stringify({ type: 'ice_candidate', candidate: msg.candidate }));
            }
          }
        } else if (room.broadcaster) {
          room.broadcaster.send(JSON.stringify({ type: 'ice_candidate', candidate: msg.candidate, viewerId: meta.userId }));
        }
        break;
      }
    }
  }

  private async handleDisconnect(ws: WebSocket) {
    const meta = this.sessions.get(ws);
    if (!meta?.streamId) {
      this.sessions.delete(ws);
      return;
    }

    const room = this.getRoom(meta.streamId);
    if (meta.role === 'broadcaster' && room.broadcaster === ws) {
      room.broadcaster = null;
      room.broadcasterId = null;
      this.broadcastToRoom(meta.streamId, { type: 'stream_ended' });
    } else if (meta.role === 'viewer') {
      await this.updateViewerCount(meta.streamId);
      if (room.broadcaster) {
        room.broadcaster.send(JSON.stringify({ type: 'viewer_left', viewerId: meta.userId }));
      }
    }

    this.sessions.delete(ws);
    if (this.getViewerCount(meta.streamId) === 0 && !room.broadcaster) {
      this.rooms.delete(meta.streamId);
    }
  }

  private async updateViewerCount(streamId: string) {
    const count = this.getViewerCount(streamId);
    await this.env.DB.prepare(`
      UPDATE streams SET viewer_count = ?,
      peak_viewers = CASE WHEN ? > peak_viewers THEN ? ELSE peak_viewers END
      WHERE id = ?
    `).bind(count, count, count, streamId).run();
    this.broadcastToRoom(streamId, { type: 'viewer_count', count });
  }

  private broadcastToRoom(streamId: string, message: object, exclude?: WebSocket) {
    const payload = JSON.stringify(message);
    const room = this.getRoom(streamId);
    if (room.broadcaster && room.broadcaster !== exclude) room.broadcaster.send(payload);
    for (const viewer of this.getViewers(streamId)) {
      if (viewer !== exclude) viewer.send(payload);
    }
  }
}
