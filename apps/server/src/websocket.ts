import { WebSocketServer, WebSocket } from 'ws';
import type { Server } from 'http';
import { nanoid } from 'nanoid';
import { verifyToken, getUserById } from './auth.js';
import { db } from './db.js';

interface Client {
  ws: WebSocket;
  userId?: string;
  username?: string;
  streamId?: string;
  role?: 'viewer' | 'broadcaster';
}

interface RoomState {
  broadcaster?: WebSocket;
  broadcasterId?: string;
  viewers: Set<WebSocket>;
  viewerCount: number;
}

const rooms = new Map<string, RoomState>();
const clients = new Map<WebSocket, Client>();

function getRoom(streamId: string): RoomState {
  if (!rooms.has(streamId)) {
    rooms.set(streamId, { viewers: new Set(), viewerCount: 0 });
  }
  return rooms.get(streamId)!;
}

function broadcastToRoom(streamId: string, message: object, exclude?: WebSocket) {
  const room = rooms.get(streamId);
  if (!room) return;

  const payload = JSON.stringify(message);
  if (room.broadcaster && room.broadcaster !== exclude && room.broadcaster.readyState === WebSocket.OPEN) {
    room.broadcaster.send(payload);
  }
  for (const viewer of room.viewers) {
    if (viewer !== exclude && viewer.readyState === WebSocket.OPEN) {
      viewer.send(payload);
    }
  }
}

function updateViewerCount(streamId: string) {
  const room = getRoom(streamId);
  room.viewerCount = room.viewers.size;
  db.prepare(`
    UPDATE streams SET viewer_count = ?,
    peak_viewers = CASE WHEN ? > peak_viewers THEN ? ELSE peak_viewers END
    WHERE id = ?
  `).run(room.viewerCount, room.viewerCount, room.viewerCount, streamId);
  broadcastToRoom(streamId, { type: 'viewer_count', count: room.viewerCount });
}

export function setupWebSocket(server: Server) {
  const wss = new WebSocketServer({ server, path: '/ws' });

  wss.on('connection', (ws) => {
    const client: Client = { ws };
    clients.set(ws, client);

    ws.on('message', (raw) => {
      try {
        const msg = JSON.parse(raw.toString());
        handleMessage(ws, client, msg);
      } catch {
        ws.send(JSON.stringify({ type: 'error', message: 'Invalid message' }));
      }
    });

    ws.on('close', () => {
      handleDisconnect(ws, client);
      clients.delete(ws);
    });
  });

  return wss;
}

function handleMessage(ws: WebSocket, client: Client, msg: Record<string, unknown>) {
  switch (msg.type) {
    case 'auth': {
      const token = msg.token as string;
      const payload = verifyToken(token);
      if (!payload) { ws.send(JSON.stringify({ type: 'error', message: 'Auth failed' })); return; }
      const user = getUserById(payload.userId);
      if (!user) { ws.send(JSON.stringify({ type: 'error', message: 'User not found' })); return; }
      client.userId = user.id;
      client.username = user.display_name;
      ws.send(JSON.stringify({ type: 'auth_ok', user: { id: user.id, display_name: user.display_name } }));
      break;
    }

    case 'join': {
      const streamId = msg.streamId as string;
      const role = (msg.role as 'viewer' | 'broadcaster') || 'viewer';
      client.streamId = streamId;
      client.role = role;
      const room = getRoom(streamId);

      if (role === 'broadcaster') {
        room.broadcaster = ws;
        room.broadcasterId = client.userId;
        ws.send(JSON.stringify({ type: 'joined', role: 'broadcaster', viewerCount: room.viewerCount }));
      } else {
        room.viewers.add(ws);
        updateViewerCount(streamId);
        ws.send(JSON.stringify({ type: 'joined', role: 'viewer', viewerCount: room.viewerCount }));

        // Notify broadcaster of new viewer for WebRTC
        if (room.broadcaster?.readyState === WebSocket.OPEN) {
          room.broadcaster.send(JSON.stringify({
            type: 'viewer_joined',
            viewerId: client.userId || nanoid(),
          }));
        }
      }
      break;
    }

    case 'chat': {
      if (!client.streamId || !client.userId) return;
      const content = (msg.content as string)?.slice(0, 500);
      if (!content?.trim()) return;

      const id = nanoid();
      db.prepare('INSERT INTO chat_messages (id, stream_id, user_id, username, content, type) VALUES (?, ?, ?, ?, ?, ?)')
        .run(id, client.streamId, client.userId, client.username || 'Anonymous', content, 'message');

      broadcastToRoom(client.streamId, {
        type: 'chat',
        id,
        userId: client.userId,
        username: client.username,
        content,
        timestamp: new Date().toISOString(),
      });
      break;
    }

    case 'gift': {
      if (!client.streamId) return;
      broadcastToRoom(client.streamId, {
        type: 'gift_animation',
        gift: msg.gift,
        username: client.username,
        message: msg.message,
      });
      break;
    }

    // WebRTC Signaling
    case 'offer': {
      const targetStreamId = client.streamId;
      if (!targetStreamId) return;
      const room = getRoom(targetStreamId);
      // Forward offer to all viewers or specific viewer
      const targetViewerId = msg.targetViewerId as string | undefined;
      if (targetViewerId) {
        for (const [viewerWs, viewerClient] of clients) {
          if (viewerClient.userId === targetViewerId && viewerClient.streamId === targetStreamId) {
            viewerWs.send(JSON.stringify({ type: 'offer', offer: msg.offer, broadcasterId: client.userId }));
            return;
          }
        }
      } else {
        for (const viewer of room.viewers) {
          if (viewer.readyState === WebSocket.OPEN) {
            viewer.send(JSON.stringify({ type: 'offer', offer: msg.offer, broadcasterId: client.userId }));
          }
        }
      }
      break;
    }

    case 'answer': {
      const room = client.streamId ? getRoom(client.streamId) : null;
      if (room?.broadcaster?.readyState === WebSocket.OPEN) {
        room.broadcaster.send(JSON.stringify({
          type: 'answer',
          answer: msg.answer,
          viewerId: client.userId,
        }));
      }
      break;
    }

    case 'ice_candidate': {
      const streamId = client.streamId;
      if (!streamId) return;
      const room = getRoom(streamId);

      if (client.role === 'broadcaster') {
        const targetViewerId = msg.viewerId as string;
        for (const [viewerWs, viewerClient] of clients) {
          if (viewerClient.userId === targetViewerId) {
            viewerWs.send(JSON.stringify({ type: 'ice_candidate', candidate: msg.candidate }));
            return;
          }
        }
      } else if (room.broadcaster?.readyState === WebSocket.OPEN) {
        room.broadcaster.send(JSON.stringify({
          type: 'ice_candidate',
          candidate: msg.candidate,
          viewerId: client.userId,
        }));
      }
      break;
    }

    case 'reaction': {
      if (!client.streamId) return;
      broadcastToRoom(client.streamId, {
        type: 'reaction',
        emoji: msg.emoji,
        username: client.username,
      });
      break;
    }
  }
}

function handleDisconnect(ws: WebSocket, client: Client) {
  if (!client.streamId) return;
  const room = rooms.get(client.streamId);
  if (!room) return;

  if (client.role === 'broadcaster') {
    room.broadcaster = undefined;
    broadcastToRoom(client.streamId, { type: 'stream_ended' });
  } else {
    room.viewers.delete(ws);
    updateViewerCount(client.streamId);

    if (room.broadcaster?.readyState === WebSocket.OPEN) {
      room.broadcaster.send(JSON.stringify({ type: 'viewer_left', viewerId: client.userId }));
    }
  }

  if (room.viewers.size === 0 && !room.broadcaster) {
    rooms.delete(client.streamId);
  }
}

export { broadcastToRoom };
