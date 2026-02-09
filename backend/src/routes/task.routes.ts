import { Router, Request } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma';
import { authenticate } from '../middleware/auth.middleware';
import { asyncHandler, AppError } from '../middleware/error.middleware';

const router = Router();

// Get tasks for a project
router.get('/project/:projectId', authenticate, asyncHandler(async (req: Request, res) => {
  const tasks = await prisma.task.findMany({
    where: { projectId: req.params.projectId },
    include: {
      assignee: { select: { id: true, firstName: true, lastName: true, email: true, avatarUrl: true } },
      workPackage: { select: { id: true, name: true } },
      milestone: { select: { id: true, name: true } },
      _count: { select: { comments: true, attachments: true } },
    },
    orderBy: [{ sortOrder: 'asc' }, { createdAt: 'desc' }],
  });

  res.json({ tasks });
}));

// Get tasks for a work package
router.get('/work-package/:workPackageId', authenticate, asyncHandler(async (req: Request, res) => {
  const tasks = await prisma.task.findMany({
    where: { workPackageId: req.params.workPackageId },
    include: {
      assignee: { select: { id: true, firstName: true, lastName: true, email: true, avatarUrl: true } },
      workPackage: { select: { id: true, name: true } },
      milestone: { select: { id: true, name: true } },
      _count: { select: { comments: true, attachments: true } },
    },
    orderBy: [{ sortOrder: 'asc' }, { createdAt: 'desc' }],
  });

  res.json({ tasks });
}));

// Get my tasks
router.get('/my', authenticate, asyncHandler(async (req: Request, res) => {
  const { status, projectId } = req.query;

  // Build where clause with proper types
  const where: any = {
    assigneeId: req.user!.userId,
  };
  
  if (status && typeof status === 'string') {
    where.status = status;
  }
  
  if (projectId && typeof projectId === 'string') {
    where.projectId = projectId;
  }

  const tasks = await prisma.task.findMany({
    where,
    include: {
      project: { select: { id: true, name: true, key: true } },
      workPackage: { select: { id: true, name: true } },
      milestone: { select: { id: true, name: true, dueDate: true } },
      _count: { select: { comments: true } },
    },
    orderBy: [{ priority: 'desc' }, { dueDate: 'asc' }],
  });

  res.json({ tasks });
}));

// Create task
router.post('/', authenticate, asyncHandler(async (req: Request, res) => {
  const schema = z.object({
    title: z.string().min(1).max(200),
    description: z.string().optional(),
    projectId: z.string(),
    workPackageId: z.string().optional(),
    milestoneId: z.string().optional(),
    assigneeId: z.string().optional(),
    priority: z.enum(['LOW', 'MEDIUM', 'HIGH', 'URGENT']).optional(),
    estimatedHours: z.number().positive().optional(),
    startDate: z.date().optional(),
    dueDate: z.date().optional(),
  });

  const data = schema.parse(req.body);

  // Check project membership
  const projectMember = await prisma.projectMember.findUnique({
    where: { projectId_userId: { projectId: data.projectId, userId: req.user!.userId } },
  });

  if (!projectMember) {
    throw new AppError('You are not a member of this project', 403);
  }

  // Get next sort order
  const lastTask = await prisma.task.findFirst({
    where: { projectId: data.projectId },
    orderBy: { sortOrder: 'desc' },
  });

  const task = await prisma.task.create({
    data: {
      title: data.title,
      description: data.description,
      projectId: data.projectId,
      workPackageId: data.workPackageId,
      milestoneId: data.milestoneId,
      assigneeId: data.assigneeId,
      creatorId: req.user!.userId,
      priority: data.priority || 'MEDIUM',
      estimatedHours: data.estimatedHours,
      startDate: data.startDate,
      dueDate: data.dueDate,
      sortOrder: (lastTask?.sortOrder || 0) + 1,
    },
    include: {
      assignee: { select: { id: true, firstName: true, lastName: true, email: true, avatarUrl: true } },
      workPackage: { select: { id: true, name: true } },
      milestone: { select: { id: true, name: true } },
    },
  });

  // Log activity
  await prisma.activity.create({
    data: {
      action: 'TASK_CREATED',
      entityType: 'Task',
      entityId: task.id,
      userId: req.user!.userId,
      projectId: task.projectId,
      taskId: task.id,
    },
  });

  res.status(201).json({ task });
}));

// Get single task
router.get('/:id', authenticate, asyncHandler(async (req: Request, res) => {
  const task = await prisma.task.findFirst({
    where: { id: req.params.id },
    include: {
      project: { select: { id: true, name: true, key: true } },
      workPackage: { select: { id: true, name: true } },
      milestone: { select: { id: true, name: true, dueDate: true } },
      assignee: { select: { id: true, firstName: true, lastName: true, email: true, avatarUrl: true } },
      creator: { select: { id: true, firstName: true, lastName: true } },
      comments: {
        include: {
          user: { select: { id: true, firstName: true, lastName: true, avatarUrl: true } },
        },
        orderBy: { createdAt: 'asc' },
      },
      attachments: true,
      dependencies: {
        include: {
          dependsOnTask: { select: { id: true, title: true, status: true } },
        },
      },
      dependents: {
        include: {
          task: { select: { id: true, title: true, status: true } },
        },
      },
    },
  });

  if (!task) {
    throw new AppError('Task not found', 404);
  }

  res.json({ task });
}));

// Update task
router.put('/:id', authenticate, asyncHandler(async (req: Request, res) => {
  const schema = z.object({
    title: z.string().min(1).max(200).optional(),
    description: z.string().optional().nullable(),
    status: z.enum(['TODO', 'IN_PROGRESS', 'IN_REVIEW', 'DONE', 'CANCELLED']).optional(),
    priority: z.enum(['LOW', 'MEDIUM', 'HIGH', 'URGENT']).optional(),
    assigneeId: z.string().optional().nullable(),
    estimatedHours: z.number().positive().optional().nullable(),
    loggedHours: z.number().min(0).optional(),
    startDate: z.date().optional().nullable(),
    dueDate: z.date().optional().nullable(),
    sortOrder: z.number().optional(),
  });

  const data = schema.parse(req.body);

  const existingTask = await prisma.task.findUnique({
    where: { id: req.params.id },
  });

  if (!existingTask) {
    throw new AppError('Task not found', 404);
  }

  const task = await prisma.task.update({
    where: { id: req.params.id },
    data: {
      ...data,
      ...(data.status === 'DONE' && !existingTask.completedAt && { completedAt: new Date() }),
    },
    include: {
      assignee: { select: { id: true, firstName: true, lastName: true, email: true, avatarUrl: true } },
      workPackage: { select: { id: true, name: true } },
      milestone: { select: { id: true, name: true } },
    },
  });

  // Log activity
  await prisma.activity.create({
    data: {
      action: 'TASK_UPDATED',
      entityType: 'Task',
      entityId: task.id,
      userId: req.user!.userId,
      projectId: task.projectId,
      taskId: task.id,
    },
  });

  res.json({ task });
}));

// Reorder tasks
router.put('/reorder', authenticate, asyncHandler(async (req: Request, res) => {
  const schema = z.object({
    projectId: z.string(),
    taskUpdates: z.array(z.object({
      id: z.string(),
      sortOrder: z.number(),
      status: z.enum(['TODO', 'IN_PROGRESS', 'IN_REVIEW', 'DONE', 'CANCELLED']).optional(),
    })),
  });

  const { projectId, taskUpdates } = schema.parse(req.body);

  // Check project membership
  const projectMember = await prisma.projectMember.findUnique({
    where: { projectId_userId: { projectId, userId: req.user!.userId } },
  });

  if (!projectMember) {
    throw new AppError('You are not a member of this project', 403);
  }

  // Update all tasks
  await prisma.$transaction(
    taskUpdates.map(update =>
      prisma.task.update({
        where: { id: update.id },
        data: {
          sortOrder: update.sortOrder,
          ...(update.status && { status: update.status }),
        },
      })
    )
  );

  res.json({ message: 'Tasks reordered successfully' });
}));

// Assign task
router.put('/:id/assign', authenticate, asyncHandler(async (req: Request, res) => {
  const schema = z.object({
    assigneeId: z.string().nullable(),
  });

  const { assigneeId } = schema.parse(req.body);

  const task = await prisma.task.update({
    where: { id: req.params.id },
    data: { assigneeId },
    include: {
      assignee: { select: { id: true, firstName: true, lastName: true, email: true, avatarUrl: true } },
    },
  });

  // Log activity
  await prisma.activity.create({
    data: {
      action: 'TASK_ASSIGNED',
      entityType: 'Task',
      entityId: task.id,
      userId: req.user!.userId,
      projectId: task.projectId,
      taskId: task.id,
      metadata: { assigneeId },
    },
  });

  res.json({ task });
}));

// Delete task
router.delete('/:id', authenticate, asyncHandler(async (req: Request, res) => {
  const task = await prisma.task.findUnique({
    where: { id: req.params.id },
  });

  if (!task) {
    throw new AppError('Task not found', 404);
  }

  await prisma.task.delete({
    where: { id: req.params.id },
  });

  res.json({ message: 'Task deleted successfully' });
}));

export default router;
