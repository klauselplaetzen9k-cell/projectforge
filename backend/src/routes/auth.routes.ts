// ============================================================================
// Authentication Routes
// ============================================================================

import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma';
import {
  hashPassword,
  verifyPassword,
  generateTokenPair,
  verifyAccessToken,
  verifyRefreshToken,
  createUserSession,
  invalidateSession,
  invalidateAllUserSessions,
  getUserSessions,
  validateCredentials,
} from '../lib/auth';
import { authenticate, AuthenticatedRequest } from '../middleware/auth.middleware';
import { asyncHandler, AppError } from '../middleware/error.middleware';

const router = Router();

// ============================================================================
// Validation Schemas
// ============================================================================

const registerSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  firstName: z.string().min(1, 'First name is required').max(50),
  lastName: z.string().min(1, 'Last name is required').max(50),
});

const loginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(1, 'Password is required'),
});

const refreshSchema = z.object({
  refreshToken: z.string().min(1, 'Refresh token is required'),
});

// ============================================================================
// POST /api/auth/register
// ============================================================================

router.post('/register', asyncHandler(async (req, res) => {
  const data = registerSchema.parse(req.body);

  // Check if user already exists
  const existingUser = await prisma.user.findUnique({
    where: { email: data.email },
  });

  if (existingUser) {
    throw new AppError('Email already registered', 409);
  }

  // Create user
  const user = await prisma.user.create({
    data: {
      email: data.email,
      passwordHash: await hashPassword(data.password),
      firstName: data.firstName,
      lastName: data.lastName,
    },
    select: {
      id: true,
      email: true,
      firstName: true,
      lastName: true,
      role: true,
      createdAt: true,
    },
  });

  // Generate tokens
  const tokens = generateTokenPair({
    userId: user.id,
    email: user.email,
    role: user.role,
  });

  // Create session
  await createUserSession(
    user.id,
    tokens.refreshToken,
    req.ip,
    req.get('user-agent'),
    tokens.accessToken
  );

  res.status(201).json({
    message: 'Registration successful',
    user,
    ...tokens,
  });
}));

// ============================================================================
// POST /api/auth/login
// ============================================================================

router.post('/login', asyncHandler(async (req, res) => {
  const data = loginSchema.parse(req.body);

  // Validate credentials
  const result = await validateCredentials(data.email, data.password);

  if (!result) {
    throw new AppError('Invalid credentials', 401);
  }

  if (result.error) {
    throw new AppError(result.error, 403);
  }

  const user = result.user;

  // Update last login
  await prisma.user.update({
    where: { id: user.id },
    data: { lastLoginAt: new Date() },
  });

  // Generate tokens
  const tokens = generateTokenPair({
    userId: user.id,
    email: user.email,
    role: user.role,
  });

  // Create session
  await createUserSession(
    user.id,
    tokens.refreshToken,
    req.ip,
    req.get('user-agent'),
    tokens.accessToken
  );

  res.json({
    message: 'Login successful',
    user: {
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      role: user.role,
    },
    ...tokens,
  });
}));

// ============================================================================
// POST /api/auth/refresh
// ============================================================================

router.post('/refresh', asyncHandler(async (req, res) => {
  const data = refreshSchema.parse(req.body);

  // Verify refresh token
  const payload = verifyRefreshToken(data.refreshToken);

  if (!payload) {
    throw new AppError('Invalid refresh token', 401);
  }

  // Check if session exists and is valid
  const session = await getSessionByRefreshToken(data.refreshToken);

  if (!session) {
    throw new AppError('Session not found', 401);
  }

  // Generate new tokens
  const tokens = generateTokenPair({
    userId: payload.userId,
    email: payload.email,
    role: payload.role,
  });

  // Update session with new tokens
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + 30);

  await prisma.userSession.update({
    where: { id: session.id },
    data: {
      token: tokens.refreshToken,
      accessToken: tokens.accessToken,
      expiresAt,
    },
  });

  res.json({
    message: 'Token refreshed successfully',
    ...tokens,
  });
}));

// ============================================================================
// POST /api/auth/logout
// ============================================================================

router.post('/logout', authenticate, asyncHandler(async (req: AuthenticatedRequest, res) => {
  const authHeader = req.headers.authorization;
  const accessToken = authHeader?.substring(7);

  if (accessToken) {
    // Invalidate this session
    await invalidateSession(accessToken);
  }

  res.json({ message: 'Logged out successfully' });
}));

// ============================================================================
// POST /api/auth/logout-all
// ============================================================================

router.post('/logout-all', authenticate, asyncHandler(async (req: AuthenticatedRequest, res) => {
  await invalidateAllUserSessions(req.user!.userId);

  res.json({ message: 'All sessions logged out successfully' });
}));

// ============================================================================
// GET /api/auth/sessions
// ============================================================================

router.get('/sessions', authenticate, asyncHandler(async (req: AuthenticatedRequest, res) => {
  const sessions = await getUserSessions(req.user!.userId);

  res.json({ sessions });
}));

// ============================================================================
// GET /api/auth/me
// ============================================================================

router.get('/me', authenticate, asyncHandler(async (req: AuthenticatedRequest, res) => {
  const user = await prisma.user.findUnique({
    where: { id: req.user!.userId },
    select: {
      id: true,
      email: true,
      firstName: true,
      lastName: true,
      avatarUrl: true,
      role: true,
      createdAt: true,
      lastLoginAt: true,
    },
  });

  if (!user) {
    throw new AppError('User not found', 404);
  }

  res.json({ user });
}));

// ============================================================================
// Export
// ============================================================================

export default router;
