import { Router, Request } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma';
import { authenticate } from '../middleware/auth.middleware';
import { asyncHandler, AppError } from '../middleware/error.middleware';

const router = Router();

// Get work packages for a project
router.get('/project/:projectId', authenticate, async (req: Request, res) => {
  const workPackages = await prisma.workPackage.findMany({
    where: { projectId: req.params.projectId },
    include: {
      parent: { select: { id: true, name: true } },
      _count: { select: { tasks: true, children: true } },
      tasks: {
        select: { status: true },
      },
    },
    orderBy: { sortOrder: 'asc' },
  });

  res.json({ workPackages });
});

// Create work package
router.post('/', authenticate, async (req: Request, res) => {
  const schema = z.object({
    name: z.string().min(1).max(200),
    description: z.string().optional(),
    projectId: z.string(),
    parentId: z.string().optional(),
    status: z.enum(['TODO', 'IN_PROGRESS', 'REVIEW', 'DONE', 'ARCHIVED']).optional(),
    priority: z.enum(['LOW', 'MEDIUM', 'HIGH', 'URGENT']).optional(),
    startDate: z.date().optional(),
    dueDate: z.date().optional(),
  });

  const data = schema.parse(req.body);

  // Get next sort order
  const lastWP = await prisma.workPackage.findFirst({
    where: { projectId: data.projectId },
    orderBy: { sortOrder: 'desc' },
  });

  const workPackage = await prisma.workPackage.create({
    data: {
      ...data,
      sortOrder: (lastWP?.sortOrder || 0) + 1,
      status: data.status || 'TODO',
      priority: data.priority || 'MEDIUM',
    },
    include: {
      parent: { select: { id: true, name: true } },
    },
  });

  res.status(201).json({ workPackage });
});

// Get single work package
router.get('/:id', authenticate, async (req: Request, res) => {
  const workPackage = await prisma.workPackage.findFirst({
    where: { id: req.params.id },
    include: {
      project: { select: { id: true, name: true, key: true } },
      parent: true,
      children: {
        include: {
          _count: { select: { tasks: true } },
        },
      },
      tasks: {
        include: {
          assignee: { select: { id: true, firstName: true, lastName: true, avatarUrl: true } },
          _count: { select: { comments: true } },
        },
        orderBy: { sortOrder: 'asc' },
      },
      milestones: true,
    },
  });

  if (!workPackage) {
    throw new AppError('Work package not found', 404);
  }

  // Calculate progress
  const completedTasks = workPackage.tasks.filter(t => t.status === 'DONE').length;
  const progress = workPackage.tasks.length > 0
    ? Math.round((completedTasks / workPackage.tasks.length) * 100)
    : 0;

  res.json({ workPackage: { ...workPackage, progress } });
});

// Update work package
router.put('/:id', authenticate, async (req: Request, res) => {
  const schema = z.object({
    name: z.string().min(1).max(200).optional(),
    description: z.string().optional().nullable(),
    status: z.enum(['TODO', 'IN_PROGRESS', 'REVIEW', 'DONE', 'ARCHIVED']).optional(),
    priority: z.enum(['LOW', 'MEDIUM', 'HIGH', 'URGENT']).optional(),
    parentId: z.string().optional().nullable(),
    startDate: z.date().optional().nullable(),
    dueDate: z.date().optional().nullable(),
    sortOrder: z.number().optional(),
  });

  const data = schema.parse(req.body);

  const workPackage = await prisma.workPackage.update({
    where: { id: req.params.id },
    data,
    include: {
      parent: { select: { id: true, name: true } },
    },
  });

  res.json({ workPackage });
});

// Delete work package
router.delete('/:id', authenticate, async (req: Request, res) => {
  await prisma.workPackage.delete({
    where: { id: req.params.id },
  });

  res.json({ message: 'Work package deleted successfully' });
});

export default router;
