import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma';
import {
  hashPassword,
  verifyPassword,
  generateToken,
  createUserSession,
  createUser,
} from '../lib/auth';
import { authenticate, AuthenticatedRequest } from '../middleware/auth.middleware';
import { asyncHandler, AppError } from '../middleware/error.middleware';

const router = Router();

// Register
router.post('/register', asyncHandler(async (req, res) => {
  const schema = z.object({
    email: z.string().email(),
    password: z.string().min(8),
    firstName: z.string().min(1),
    lastName: z.string().min(1),
  });

  const data = schema.parse(req.body);

  const existingUser = await prisma.user.findUnique({
    where: { email: data.email },
  });

  if (existingUser) {
    throw new AppError('Email already registered', 409);
  }

  const passwordHash = await hashPassword(data.password);

  const user = await prisma.user.create({
    data: {
      email: data.email,
      passwordHash,
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

  const token = generateToken({
    userId: user.id,
    email: user.email,
    role: user.role,
  });

  await createUserSession(user.id, token, req.ip, req.get('user-agent'));

  res.status(201).json({
    message: 'Registration successful',
    user,
    token,
  });
}));

// Login
router.post('/login', asyncHandler(async (req, res) => {
  const schema = z.object({
    email: z.string().email(),
    password: z.string(),
  });

  const data = schema.parse(req.body);

  const user = await prisma.user.findUnique({
    where: { email: data.email },
  });

  if (!user || !user.passwordHash) {
    throw new AppError('Invalid credentials', 401);
  }

  if (!user.isActive) {
    throw new AppError('Account is deactivated', 403);
  }

  const validPassword = await verifyPassword(data.password, user.passwordHash);

  if (!validPassword) {
    throw new AppError('Invalid credentials', 401);
  }

  // Update last login
  await prisma.user.update({
    where: { id: user.id },
    data: { lastLoginAt: new Date() },
  });

  const token = generateToken({
    userId: user.id,
    email: user.email,
    role: user.role,
  });

  await createUserSession(user.id, token, req.ip, req.get('user-agent'));

  res.json({
    message: 'Login successful',
    user: {
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      role: user.role,
    },
    token,
  });
}));

// Get current user
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

// Logout
router.post('/logout', authenticate, asyncHandler(async (req: AuthenticatedRequest, res) => {
  const authHeader = req.headers.authorization;
  const token = authHeader?.substring(7);

  if (token) {
    await prisma.userSession.deleteMany({
      where: { token },
    });
  }

  res.json({ message: 'Logged out successfully' });
}));

// Logout all sessions
router.post('/logout-all', authenticate, asyncHandler(async (req: AuthenticatedRequest, res) => {
  await prisma.userSession.deleteMany({
    where: { userId: req.user!.userId },
  });

  res.json({ message: 'All sessions logged out' });
}));

export default router;
