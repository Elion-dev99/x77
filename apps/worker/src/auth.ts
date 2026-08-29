import { SignJWT, jwtVerify } from 'jose';
import type { Env, User, UserRow } from './types';

const encoder = new TextEncoder();

export async function hashPassword(password: string): Promise<string> {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const key = await crypto.subtle.importKey('raw', encoder.encode(password), 'PBKDF2', false, ['deriveBits']);
  const bits = await crypto.subtle.deriveBits(
    { name: 'PBKDF2', salt, iterations: 100000, hash: 'SHA-256' },
    key,
    256,
  );
  const saltB64 = btoa(String.fromCharCode(...salt));
  const hashB64 = btoa(String.fromCharCode(...new Uint8Array(bits)));
  return `pbkdf2:100000:${saltB64}:${hashB64}`;
}

export async function verifyPassword(password: string, stored: string): Promise<boolean> {
  const [, iterations, saltB64, hashB64] = stored.split(':');
  if (!iterations || !saltB64 || !hashB64) return false;
  const salt = Uint8Array.from(atob(saltB64), (c) => c.charCodeAt(0));
  const key = await crypto.subtle.importKey('raw', encoder.encode(password), 'PBKDF2', false, ['deriveBits']);
  const bits = await crypto.subtle.deriveBits(
    { name: 'PBKDF2', salt, iterations: parseInt(iterations, 10), hash: 'SHA-256' },
    key,
    256,
  );
  const hashB64New = btoa(String.fromCharCode(...new Uint8Array(bits)));
  return hashB64New === hashB64;
}

export async function createToken(userId: string, secret: string): Promise<string> {
  return new SignJWT({ userId })
    .setProtectedHeader({ alg: 'HS256' })
    .setExpirationTime('7d')
    .sign(encoder.encode(secret));
}

export async function verifyToken(token: string, secret: string): Promise<{ userId: string } | null> {
  try {
    const { payload } = await jwtVerify(token, encoder.encode(secret));
    return { userId: payload.userId as string };
  } catch {
    return null;
  }
}

export function sanitizeUser(user: UserRow | User): User {
  const { password_hash: _, ...safe } = user as UserRow;
  return safe;
}

export async function getUserById(db: D1Database, id: string): Promise<User | null> {
  return db.prepare('SELECT * FROM users WHERE id = ?').bind(id).first<User>();
}

export async function getUserByUsername(db: D1Database, username: string): Promise<UserRow | null> {
  return db.prepare('SELECT * FROM users WHERE username = ?').bind(username).first<UserRow>();
}

export async function deductPoints(db: D1Database, userId: string, amount: number): Promise<boolean> {
  const user = await getUserById(db, userId);
  if (!user || user.points < amount) return false;
  await db.prepare('UPDATE users SET points = points - ? WHERE id = ?').bind(amount, userId).run();
  return true;
}

export async function addPoints(db: D1Database, userId: string, amount: number): Promise<void> {
  await db.prepare('UPDATE users SET points = points + ? WHERE id = ?').bind(amount, userId).run();
}

export async function getAuthUser(request: Request, env: Env): Promise<User | null> {
  const header = request.headers.get('Authorization');
  if (!header?.startsWith('Bearer ')) return null;
  const payload = await verifyToken(header.slice(7), env.JWT_SECRET);
  if (!payload) return null;
  return getUserById(env.DB, payload.userId);
}
