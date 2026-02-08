import { Prisma, UserRole } from '@prisma/client';
import { z } from 'zod';
import { prisma } from '../lib/prisma';
import { authenticate } from '../middleware/auth.middleware';
import { asyncHandler, AppError } from '../middleware/error.middleware';
import { hashPassword } from '../lib/auth';

const router = Router();

// Search users (for assigning to tasks/teams)
router.get('/search', authenticate, asyncHandler(async (req: Request, res) => {
  const { q } = req.query;

  if (!q || typeof q !== 'string' || q.length < 2) {
    return res.json({ users: [] });
  }

  const users = await prisma.user.findMany({
    where: {
      AND: [
        { isActive: true },
        {
          OR: [
            { email: { contains: q.toLowerCase() } },
            { firstName: { contains: q, mode: 'insensitive' } },
            { lastName: { contains: q, mode: 'insensitive' } },
          ],
        },
      ],
    },
    select: {
      id: true,
      email: true,
      firstName: true,
      lastName: true,
      avatarUrl: true,
    },
    take: 10,
  });

  res.json({ users });
}));

// Get all users (admin only)
router.get('/', authenticate, asyncHandler(async (req: Request, res) => {
  const { role, isActive, search } = req.query;

  const users = await prisma.user.findMany({
    where: {
      ...(role && { role: role as UserRole }),
      ...(isActive !== undefined && { isActive: isActive === 'true' }),
      ...(search && {
        OR: [
          { email: { contains: String(search), mode: 'insensitive' } },
          { firstName: { contains: String(search), mode: 'insensitive' } },
          { lastName: { contains: String(search), mode: 'insensitive' } },
        ],
      }),
    },
    select: {
      id: true,
      email: true,
      firstName: true,
      lastName: true,
      avatarUrl: true,
      role: true,
      isActive: true,
      createdAt: true,
      lastLoginAt: true,
      _count: {
        select: {
          assignedTasks: true,
          teamMemberships: true,
        },
      },
    },
    orderBy: { createdAt: 'desc' },
  });

  res.json({ users });
}));

// Get user by ID
router.get('/:id', authenticate, asyncHandler(async (req: Request, res) => {
  const user = await prisma.user.findUnique({
    where: { id: req.params.id },
    select: {
      id: true,
      email: true,
      firstName: true,
      lastName: true,
      avatarUrl: true,
      role: true,
      isActive: true,
      createdAt: true,
      lastLoginAt: true,
      teamMemberships: {
        include: {
          team: { select: { id: true, name: true, slug: true } },
        },
      },
      _count: {
        select: {
          assignedTasks: true,
          createdTasks: true,
        },
      },
    },
  });

  if (!user) {
    throw new AppError('User not found', 404);
  }

  res.json({ user });
}));

// Update profile (own profile)
router.put('/profile', authenticate, asyncHandler(async (req: Request, res) => {
  const schema = z.object({
    firstName: z.string().min(1).max(50).optional(),
    lastName: z.string().min(1).max(50).optional(),
    avatarUrl: z.string().url().optional().nullable(),
  });

  const data = schema.parse(req.body);

  const user = await prisma.user.update({
    where: { id: req.user!.userId },
    data,
    select: {
      id: true,
      email: true,
      firstName: true,
      lastName: true,
      avatarUrl: true,
      role: true,
    },
  });

  res.json({ user });
}));

// Change password
router.put('/change-password', authenticate, asyncHandler(async (req: Request, res) => {
  const schema = z.object({
    currentPassword: z.string(),
    newPassword: z.string().min(8),
  });

  const data = schema.parse(req.body);

  const user = await prisma.user.findUnique({
    where: { id: req.user!.userId },
    select: { passwordHash: true },
  });

  if (!user || !user.passwordHash) {
    throw new AppError('Cannot change password for OAuth users', 400);
  }

  const { verifyPassword } = await import('../lib/auth.js');
  const validPassword = await verifyPassword(data.currentPassword, user.passwordHash);

  if (!validPassword) {
    throw new AppError('Current password is incorrect', 401);
  }

  const newPasswordHash = await hashPassword(data.newPassword);

  await prisma.user.update({
    where: { id: req.user!.userId },
    data: { passwordHash: newPasswordHash },
  });

  res.json({ message: 'Password changed successfully' });
}));

// Get notifications
router.get('/notifications', authenticate, asyncHandler(async (req: Request, res) => {
  const { unreadOnly, limit } = req.query;

  const notifications = await prisma.notification.findMany({
    where: {
      userId: req.user!.userId,
      ...(unreadOnly === 'true' && { isRead: false }),
    },
    orderBy: { createdAt: 'desc' },
    take: limit ? parseInt(String(limit)) : 50,
  });

  const unreadCount = await prisma.notification.count({
    where: {
      userId: req.user!.userId,
      isRead: false,
    },
  });

  res.json({ notifications, unreadCount });
}));

// Mark notification as read
router.put('/notifications/:id/read', authenticate, asyncHandler(async (req: Request, res) => {
  await prisma.notification.update({
    where: { id: req.params.id },
    data: { isRead: true },
  });

  res.json({ success: true });
}));

// Mark all notifications as read
router.put('/notifications/read-all', authenticate, asyncHandler(async (req: Request, res) => {
  await prisma.notification.updateMany({
    where: {
      userId: req.user!.userId,
      isRead: false,
    },
    data: { isRead: true },
  });

  res.json({ success: true });
}));

// Admin: Update user role
router.put('/:id/role', authenticate, asyncHandler(async (req: Request, res) => {
  const schema = z.object({
    role: z.enum(['ADMIN', 'MANAGER', 'MEMBER', 'VIEWER']),
  });

  const data = schema.parse(req.body);

  const user = await prisma.user.update({
    where: { id: req.params.id },
    data: { role: data.role },
    select: {
      id: true,
      email: true,
      firstName: true,
      lastName: true,
      role: true,
    },
  });

  res.json({ user });
}));

// Admin: Deactivate user
router.put('/:id/deactivate', authenticate, asyncHandler(async (req: Request, res) => {
  await prisma.user.update({
    where: { id: req.params.id },
    data: { isActive: false },
  });

  res.json({ message: 'User deactivated successfully' });
}));

// Admin: Reactivate user
router.put('/:id/activate', authenticate, asyncHandler(async (req: Request, res) => {
  await prisma.user.update({
    where: { id: req.params.id },
    data: { isActive: true },
  });

  res.json({ message: 'User activated successfully' });
}));

export default router;
