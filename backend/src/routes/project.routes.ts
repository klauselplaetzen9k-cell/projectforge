import { Router, Request } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma';
import { authenticate, authorize } from '../middleware/auth.middleware';
import { asyncHandler, AppError } from '../middleware/error.middleware';

const router = Router();

// Get all projects for user
router.get('/', authenticate, asyncHandler(async (req: Request, res) => {
  const projects = await prisma.project.findMany({
    where: {
      members: {
        some: { userId: req.user!.userId },
      },
    },
    include: {
      team: { select: { id: true, name: true, slug: true } },
      members: {
        include: {
          user: { select: { id: true, firstName: true, lastName: true, email: true, avatarUrl: true } },
        },
      },
      _count: {
        select: { workPackages: true, milestones: true },
      },
    },
    orderBy: { updatedAt: 'desc' },
  });

  res.json({ projects });
}));

// Create project
router.post('/', authenticate, asyncHandler(async (req: Request, res) => {
  const schema = z.object({
    name: z.string().min(1).max(100),
    description: z.string().optional(),
    key: z.string().min(2).max(5).toUpperCase(),
    color: z.string().regex(/^#[0-9A-Fa-f]{6}$/).optional(),
    teamId: z.string(),
  });

  const data = schema.parse(req.body);

  // Check team membership
  const teamMember = await prisma.teamMember.findUnique({
    where: { teamId_userId: { teamId: data.teamId, userId: req.user!.userId } },
  });

  if (!teamMember) {
    throw new AppError('You are not a member of this team', 403);
  }

  // Check if project key already exists in team
  const existingProject = await prisma.project.findFirst({
    where: { teamId: data.teamId, key: data.key },
  });

  if (existingProject) {
    throw new AppError('Project key already exists in this team', 409);
  }

  const project = await prisma.project.create({
    data: {
      name: data.name,
      description: data.description,
      key: data.key,
      color: data.color || '#6366f1',
      teamId: data.teamId,
      members: {
        create: {
          userId: req.user!.userId,
          role: 'OWNER',
        },
      },
    },
    include: {
      team: { select: { id: true, name: true, slug: true } },
      members: {
        include: {
          user: { select: { id: true, firstName: true, lastName: true, email: true } },
        },
      },
    },
  });

  // Log activity
  await prisma.activity.create({
    data: {
      action: 'PROJECT_CREATED',
      entityType: 'project',
      entityId: project.id,
      userId: req.user!.userId,
      projectId: project.id,
      metadata: { projectName: project.name },
    },
  });

  res.status(201).json({ project });
}));

// Get single project
router.get('/:id', authenticate, asyncHandler(async (req: Request, res) => {
  const project = await prisma.project.findFirst({
    where: {
      id: req.params.id,
      members: { some: { userId: req.user!.userId } },
    },
    include: {
      team: true,
      members: {
        include: {
          user: { select: { id: true, firstName: true, lastName: true, email: true, avatarUrl: true } },
        },
      },
      workPackages: {
        include: {
          _count: { select: { tasks: true } },
        },
      },
      milestones: {
        orderBy: { dueDate: 'asc' },
      },
    },
  });

  if (!project) {
    throw new AppError('Project not found', 404);
  }

  res.json({ project });
}));

// Update project
router.put('/:id', authenticate, asyncHandler(async (req: Request, res) => {
  const schema = z.object({
    name: z.string().min(1).max(100).optional(),
    description: z.string().optional().nullable(),
    color: z.string().regex(/^#[0-9A-Fa-f]{6}$/).optional(),
    status: z.enum(['ACTIVE', 'ON_HOLD', 'COMPLETED', 'ARCHIVED']).optional(),
    startDate: z.date().optional().nullable(),
    endDate: z.date().optional().nullable(),
  });

  const data = schema.parse(req.body);

  const project = await prisma.project.update({
    where: { id: req.params.id },
    data,
    include: {
      team: true,
      members: {
        include: {
          user: { select: { id: true, firstName: true, lastName: true, email: true } },
        },
      },
    },
  });

  res.json({ project });
}));

// Delete project
router.delete('/:id', authenticate, asyncHandler(async (req: Request, res) => {
  await prisma.project.delete({
    where: { id: req.params.id },
  });

  res.json({ message: 'Project deleted successfully' });
}));

// Add project member
router.post('/:id/members', authenticate, asyncHandler(async (req: Request, res) => {
  const schema = z.object({
    userId: z.string(),
    role: z.enum(['OWNER', 'MANAGER', 'MEMBER', 'VIEWER']).optional(),
  });

  const data = schema.parse(req.body);

  const member = await prisma.projectMember.create({
    data: {
      projectId: req.params.id,
      userId: data.userId,
      role: data.role || 'MEMBER',
    },
    include: {
      user: { select: { id: true, firstName: true, lastName: true, email: true } },
    },
  });

  res.status(201).json({ member });
}));

// Remove project member
router.delete('/:id/members/:userId', authenticate, asyncHandler(async (req: Request, res) => {
  await prisma.projectMember.delete({
    where: {
      projectId_userId: {
        projectId: req.params.id,
        userId: req.params.userId,
      },
    },
  });

  res.json({ message: 'Member removed successfully' });
}));

export default router;
