// ============================================================================
// Authentication Library
// ============================================================================

import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { prisma } from '../lib/prisma';

// ============================================================================
// Configuration
// ============================================================================

const JWT_SECRET = process.env.JWT_SECRET || 'your-super-secret-jwt-key-change-in-production';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '7d';

const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || 'your-refresh-token-secret-change-in-production';
const JWT_REFRESH_EXPIRES_IN = process.env.JWT_REFRESH_EXPIRES_IN || '30d';

// ============================================================================
// Types
// ============================================================================

export interface TokenPayload {
  userId: string;
  email: string;
  role: string;
}

export interface TokenPair {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}

// ============================================================================
// Password Functions
// ============================================================================

/**
 * Hash a password using bcrypt
 */
export async function hashPassword(password: string): Promise<string> {
  const rounds = parseInt(process.env.BCRYPT_ROUNDS || '12');
  return bcrypt.hash(password, rounds);
}

/**
 * Verify a password against a hash
 */
export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

// ============================================================================
// Token Functions
// ============================================================================

/**
 * Generate an access token
 */
export function generateAccessToken(payload: TokenPayload): string {
  return jwt.sign(payload, JWT_SECRET, {
    expiresIn: JWT_EXPIRES_IN,
  });
}

/**
 * Generate a refresh token
 */
export function generateRefreshToken(payload: TokenPayload): string {
  return jwt.sign(payload, JWT_REFRESH_SECRET, {
    expiresIn: JWT_REFRESH_EXPIRES_IN,
  });
}

/**
 * Generate both access and refresh tokens
 */
export function generateTokenPair(payload: TokenPayload): TokenPair {
  const accessToken = generateAccessToken(payload);
  const refreshToken = generateRefreshToken(payload);

  // Calculate expiresIn in seconds
  const expiresIn = jwt.decode(accessToken) as { exp: number };
  const expiresInSeconds = expiresIn.exp - Math.floor(Date.now() / 1000);

  return {
    accessToken,
    refreshToken,
    expiresIn: expiresInSeconds,
  };
}

/**
 * Verify an access token
 */
export function verifyAccessToken(token: string): TokenPayload | null {
  try {
    return jwt.verify(token, JWT_SECRET) as TokenPayload;
  } catch {
    return null;
  }
}

/**
 * Verify a refresh token
 */
export function verifyRefreshToken(token: string): TokenPayload | null {
  try {
    return jwt.verify(token, JWT_REFRESH_SECRET) as TokenPayload;
  } catch {
    return null;
  }
}

/**
 * Verify any token (access or refresh) - tries access first, then refresh
 */
export function verifyToken(token: string): TokenPayload | null {
  // First try access token verification
  const accessPayload = verifyAccessToken(token);
  if (accessPayload) {
    return accessPayload;
  }
  // Then try refresh token verification
  return verifyRefreshToken(token);
}

// ============================================================================
// Session Functions
// ============================================================================

/**
 * Create a new user session with refresh token
 */
export async function createUserSession(
  userId: string,
  refreshToken: string,
  ipAddress?: string,
  userAgent?: string,
  accessToken?: string
) {
  const expiresAt = new Date();
  // Refresh token expires in 30 days
  expiresAt.setDate(expiresAt.getDate() + 30);

  return prisma.userSession.create({
    data: {
      userId,
      token: refreshToken, // Store refresh token
      accessToken, // Optional: store access token for immediate invalidation
      expiresAt,
      ipAddress,
      userAgent,
    },
  });
}

/**
 * Invalidate a specific session
 */
export async function invalidateSession(token: string) {
  return prisma.userSession.deleteMany({
    where: { token },
  });
}

/**
 * Invalidate all sessions for a user
 */
export async function invalidateAllUserSessions(userId: string) {
  return prisma.userSession.deleteMany({
    where: { userId },
  });
}

/**
 * Get session by refresh token
 */
export async function getSessionByRefreshToken(refreshToken: string) {
  const session = await prisma.userSession.findUnique({
    where: { token: refreshToken },
    include: { user: true },
  });

  if (!session || session.expiresAt < new Date()) {
    return null;
  }

  return session;
}

/**
 * Get all active sessions for a user
 */
export async function getUserSessions(userId: string) {
  return prisma.userSession.findMany({
    where: {
      userId,
      expiresAt: { gt: new Date() },
    },
    orderBy: { createdAt: 'desc' },
    select: {
      id: true,
      ipAddress: true,
      userAgent: true,
      createdAt: true,
      expiresAt: true,
    },
  });
}

// ============================================================================
// User Functions
// ============================================================================

/**
 * Validate user credentials
 */
export async function validateCredentials(email: string, password: string) {
  const user = await prisma.user.findUnique({
    where: { email },
  });

  if (!user || !user.passwordHash) {
    return null;
  }

  if (!user.isActive) {
    return { error: 'Account is deactivated' };
  }

  const validPassword = await verifyPassword(password, user.passwordHash);

  if (!validPassword) {
    return null;
  }

  return { user };
}

/**
 * Create a new user
 */
export async function createUser(data: {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
}) {
  const passwordHash = await hashPassword(data.password);

  return prisma.user.create({
    data: {
      email: data.email,
      passwordHash,
      firstName: data.firstName,
      lastName: data.lastName,
    },
  });
}
