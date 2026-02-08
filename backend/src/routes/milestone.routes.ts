import { Router, Request } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma';
import { authenticate } from '../middleware/auth.middleware';
import { asyncHandler, AppError } from '../middleware/error.middleware';

const router = Router();

// Get milestones for a project
router.get('/project/:projectId', authenticate, asyncHandler(async (req: Request, res) => {
  const milestones = await prisma.milestone.findMany({
    where: { projectId: req.params.projectId },
    include: {
      workPackage: { select: { id: true, name: true } },
      _count: { select: { tasks: true } },
      tasks: {
        select: { status: true },
      },
    },
    orderBy: { dueDate: 'asc' },
  });

  const milestonesWithProgress = milestones.map(m => ({
    ...m,
    completedTasks: m.tasks.filter(t => t.status === 'DONE').length,
    progress: m.tasks.length > 0
      ? Math.round((m.tasks.filter(t => t.status === 'DONE').length / m.tasks.length) * 100)
      : 0,
  }));

  res.json({ milestones: milestonesWithProgress });
}));

// Create milestone
router.post('/', authenticate, asyncHandler(async (req: Request, res) => {
  const schema = z.object({
    name: z.string().min(1).max(200),
    description: z.string().optional(),
    projectId: z.string(),
    workPackageId: z.string().optional(),
    dueDate: z.date(),
  });

  const data = schema.parse(req.body);

  const milestone = await prisma.milestone.create({
    data,
    include: {
      workPackage: { select: { id: true, name: true } },
    },
  });

  res.status(201).json({ milestone });
}));

// Get single milestone
router.get('/:id', authenticate, asyncHandler(async (req: Request, res) => {
  const milestone = await prisma.milestone.findFirst({
    where: { id: req.params.id },
    include: {
      project: { select: { id: true, name: true, key: true } },
      workPackage: true,
      tasks: {
        include: {
          assignee: { select: { id: true, firstName: true, lastName: true, avatarUrl: true } },
          _count: { select: { comments: true } },
        },
        orderBy: { sortOrder: 'asc' },
      },
    },
  });

  if (!milestone) {
    throw new AppError('Milestone not found', 404);
  }

  const completedTasks = milestone.tasks.filter(t => t.status === 'DONE').length;
  const progress = milestone.tasks.length > 0
    ? Math.round((completedTasks / milestone.tasks.length) * 100)
    : 0;

  res.json({ milestone: { ...milestone, progress, completedTasks } });
}));

// Update milestone
router.put('/:id', authenticate, asyncHandler(async (req: Request, res) => {
  const schema = z.object({
    name: z.string().min(1).max(200).optional(),
    description: z.string().optional().nullable(),
    dueDate: z.date().optional(),
    completed: z.boolean().optional(),
  });

  const data = schema.parse(req.body);

  const milestone = await prisma.milestone.update({
    where: { id: req.params.id },
    data: {
      ...data,
      ...(data.completed && { completedAt: new Date() }),
      ...(!data.completed && { completedAt: null }),
    },
    include: {
      workPackage: { select: { id: true, name: true } },
    },
  });

  if (data.completed) {
    await prisma.activity.create({
      data: {
        action: 'MILESTONE_COMPLETED',
        entityType: 'milestone',
        entityId: milestone.id,
        userId: req.user!.userId,
        projectId: milestone.projectId,
        metadata: { milestoneName: milestone.name },
      },
    });
  }

  res.json({ milestone });
}));

// Delete milestone
router.delete('/:id', authenticate, asyncHandler(async (req: Request, res) => {
  await prisma.milestone.delete({
    where: { id: req.params.id },
  });

  res.json({ message: 'Milestone deleted successfully' });
}));

// Add task to milestone
router.post('/:id/tasks', authenticate, asyncHandler(async (req: Request, res) => {
  const schema = z.object({
    taskId: z.string(),
  });

  const data = schema.parse(req.body);

  const milestone = await prisma.milestone.update({
    where: { id: req.params.id },
    data: {
      tasks: {
        connect: { id: data.taskId },
      },
    },
  });

  res.json({ milestone });
}));

// Remove task from milestone
router.delete('/:id/tasks/:taskId', authenticate, asyncHandler(async (req: Request, res) => {
  const milestone = await prisma.milestone.update({
    where: { id: req.params.id },
    data: {
      tasks: {
        disconnect: { id: req.params.taskId },
      },
    },
  });

  res.json({ milestone });
}));

export default router;
