import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { prisma } from '../lib/prisma';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '7d';

export interface TokenPayload {
  userId: string;
  email: string;
  role: string;
}

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 12);
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

export function generateToken(payload: TokenPayload): string {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
}

export function verifyToken(token: string): TokenPayload | null {
  try {
    return jwt.verify(token, JWT_SECRET) as TokenPayload;
  } catch {
    return null;
  }
}

export async function createUserSession(userId: string, token: string, ipAddress?: string, userAgent?: string) {
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + 7); // 7 days

  return prisma.userSession.create({
    data: {
      userId,
      token,
      expiresAt,
      ipAddress,
      userAgent,
    },
  });
}

export async function invalidateSession(token: string) {
  return prisma.userSession.deleteMany({
    where: { token },
  });
}

export async function getSessionUser(token: string) {
  const session = await prisma.userSession.findUnique({
    where: { token },
    include: { user: true },
  });

  if (!session || session.expiresAt < new Date()) {
    return null;
  }

  return session.user;
}
