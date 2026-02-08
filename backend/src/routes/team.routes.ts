import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma';
import { authenticate } from '../middleware/auth.middleware';
import { asyncHandler, AppError } from '../middleware/error.middleware';

const router = Router();

// Get all teams for user
router.get('/', authenticate, asyncHandler(async (req: Request, res) => {
  const teams = await prisma.team.findMany({
    where: {
      members: { some: { userId: req.user!.userId } },
    },
    include: {
      owner: { select: { id: true, firstName: true, lastName: true, email: true } },
      members: {
        include: {
          user: { select: { id: true, firstName: true, lastName: true, email: true, avatarUrl: true } },
        },
      },
      _count: { select: { projects: true } },
    },
    orderBy: { name: 'asc' },
  });

  res.json({ teams });
}));

// Create team
router.post('/', authenticate, asyncHandler(async (req: Request, res) => {
  const schema = z.object({
    name: z.string().min(1).max(100),
    description: z.string().optional(),
  });

  const data = schema.parse(req.body);

  // Generate slug from name
  const slug = data.name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');

  const team = await prisma.team.create({
    data: {
      name: data.name,
      description: data.description,
      slug,
      ownerId: req.user!.userId,
      members: {
        create: {
          userId: req.user!.userId,
          role: 'OWNER',
        },
      },
    },
    include: {
      owner: { select: { id: true, firstName: true, lastName: true, email: true } },
      members: {
        include: {
          user: { select: { id: true, firstName: true, lastName: true, email: true } },
        },
      },
    },
  });

  res.status(201).json({ team });
}));

// Get single team
router.get('/:id', authenticate, asyncHandler(async (req: Request, res) => {
  const team = await prisma.team.findFirst({
    where: {
      id: req.params.id,
      members: { some: { userId: req.user!.userId } },
    },
    include: {
      owner: { select: { id: true, firstName: true, lastName: true, email: true } },
      members: {
        include: {
          user: { select: { id: true, firstName: true, lastName: true, email: true, avatarUrl: true } },
        },
      },
      projects: {
        include: {
          _count: { select: { workPackages: true, milestones: true } },
        },
      },
    },
  });

  if (!team) {
    throw new AppError('Team not found', 404);
  }

  res.json({ team });
}));

// Update team
router.put('/:id', authenticate, asyncHandler(async (req: Request, res) => {
  const schema = z.object({
    name: z.string().min(1).max(100).optional(),
    description: z.string().optional().nullable(),
    avatarUrl: z.string().url().optional().nullable(),
  });

  const data = schema.parse(req.body);

  const team = await prisma.team.update({
    where: { id: req.params.id },
    data,
    include: {
      owner: { select: { id: true, firstName: true, lastName: true, email: true } },
      members: {
        include: {
          user: { select: { id: true, firstName: true, lastName: true, email: true } },
        },
      },
    },
  });

  res.json({ team });
}));

// Delete team
router.delete('/:id', authenticate, asyncHandler(async (req: Request, res) => {
  await prisma.team.delete({
    where: { id: req.params.id },
  });

  res.json({ message: 'Team deleted successfully' });
}));

// Add team member
router.post('/:id/members', authenticate, asyncHandler(async (req: Request, res) => {
  const schema = z.object({
    email: z.string().email(),
    role: z.enum(['OWNER', 'ADMIN', 'MEMBER', 'VIEWER']).optional(),
  });

  const data = schema.parse(req.body);

  // Find user by email
  const user = await prisma.user.findUnique({
    where: { email: data.email },
  });

  if (!user) {
    throw new AppError('User not found', 404);
  }

  const member = await prisma.teamMember.create({
    data: {
      teamId: req.params.id,
      userId: user.id,
      role: data.role || 'MEMBER',
    },
    include: {
      user: { select: { id: true, firstName: true, lastName: true, email: true } },
    },
  });

  res.status(201).json({ member });
}));

// Remove team member
router.delete('/:id/members/:userId', authenticate, asyncHandler(async (req: Request, res) => {
  await prisma.teamMember.delete({
    where: {
      teamId_userId: {
        teamId: req.params.id,
        userId: req.params.userId,
      },
    },
  });

  res.json({ message: 'Member removed successfully' });
}));

export default router;
