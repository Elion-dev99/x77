import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { db, type User } from './db.js';

const JWT_SECRET = process.env.JWT_SECRET || 'livenova-dev-secret-change-in-production';

export function hashPassword(password: string): string {
  return bcrypt.hashSync(password, 10);
}

export function verifyPassword(password: string, hash: string): boolean {
  return bcrypt.compareSync(password, hash);
}

export function createToken(userId: string): string {
  return jwt.sign({ userId }, JWT_SECRET, { expiresIn: '7d' });
}

export function verifyToken(token: string): { userId: string } | null {
  try {
    return jwt.verify(token, JWT_SECRET) as { userId: string };
  } catch {
    return null;
  }
}

export function sanitizeUser(user: User & { password_hash?: string }) {
  const { password_hash: _, ...safe } = user as User & { password_hash?: string };
  return safe;
}

export function getUserById(id: string): User | undefined {
  return db.prepare('SELECT * FROM users WHERE id = ?').get(id) as User | undefined;
}

export function getUserByUsername(username: string): (User & { password_hash: string }) | undefined {
  return db.prepare('SELECT * FROM users WHERE username = ?').get(username) as (User & { password_hash: string }) | undefined;
}

export function deductPoints(userId: string, amount: number): boolean {
  const user = getUserById(userId);
  if (!user || user.points < amount) return false;
  db.prepare('UPDATE users SET points = points - ? WHERE id = ?').run(amount, userId);
  return true;
}

export function addPoints(userId: string, amount: number): void {
  db.prepare('UPDATE users SET points = points + ? WHERE id = ?').run(amount, userId);
}
