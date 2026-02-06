import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma';
import { authenticate, AuthenticatedRequest } from '../middleware/auth.middleware';
import { asyncHandler, AppError } from '../middleware/error.middleware';

const router = Router();

// Get tasks for a project
router.get('/project/:projectId', authenticate, asyncHandler(async (req: AuthenticatedRequest, res) => {
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

// Get my tasks
router.get('/my', authenticate, asyncHandler(async (req: AuthenticatedRequest, res) => {
  const { status, projectId } = req.query;

  const tasks = await prisma.task.findMany({
    where: {
      assigneeId: req.user!.userId,
      ...(status && { status: status as string }),
      ...(projectId && { projectId: projectId as string }),
    },
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
router.post('/', authenticate, asyncHandler(async (req: AuthenticatedRequest, res) => {
  const schema = z.object({
    title: z.string().min(1).max(200),
    description: z.string().optional(),
    projectId: z.string(),
    workPackageId: z.string().optional(),
    milestoneId: z.string().optional(),
    assigneeId: z.string().optional(),
    priority: z.enum(['LOW', 'MEDIUM', 'HIGH', 'URGENT']).optional(),
    status: z.enum(['TODO', 'IN_PROGRESS', 'IN_REVIEW', 'DONE', 'CANCELLED']).optional(),
    startDate: z.date().optional(),
    dueDate: z.date().optional(),
    estimatedHours: z.number().positive().optional(),
  });

  const data = schema.parse(req.body);

  // Get next sort order
  const lastTask = await prisma.task.findFirst({
    where: { projectId: data.projectId },
    orderBy: { sortOrder: 'desc' },
  });

  const task = await prisma.task.create({
    data: {
      ...data,
      creatorId: req.user!.userId,
      sortOrder: (lastTask?.sortOrder || 0) + 1,
      status: data.status || 'TODO',
      priority: data.priority || 'MEDIUM',
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
      entityType: 'task',
      entityId: task.id,
      userId: req.user!.userId,
      projectId: task.projectId,
      metadata: { taskTitle: task.title },
    },
  });

  // Create notification for assignee
  if (data.assigneeId && data.assigneeId !== req.user!.userId) {
    await prisma.notification.create({
      data: {
        userId: data.assigneeId,
        title: 'New task assigned',
        message: `You have been assigned to: ${task.title}`,
        link: `/projects/${task.projectId}/tasks/${task.id}`,
      },
    });
  }

  res.status(201).json({ task });
}));

// Get single task
router.get('/:id', authenticate, asyncHandler(async (req: AuthenticatedRequest, res) => {
  const task = await prisma.task.findFirst({
    where: {
      id: req.params.id,
      project: {
        members: { some: { userId: req.user!.userId } },
      },
    },
    include: {
      assignee: { select: { id: true, firstName: true, lastName: true, email: true, avatarUrl: true } },
      creator: { select: { id: true, firstName: true, lastName: true, email: true } },
      workPackage: true,
      milestone: true,
      project: { select: { id: true, name: true, key: true } },
      comments: {
        include: {
          user: { select: { id: true, firstName: true, lastName: true, avatarUrl: true } },
        },
        orderBy: { createdAt: 'asc' },
      },
      attachments: true,
      dependencies: {
        include: {
          dependsOnTask: {
            select: { id: true, title: true, status: true },
          },
        },
      },
      dependents: {
        include: {
          task: {
            select: { id: true, title: true, status: true },
          },
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
router.put('/:id', authenticate, asyncHandler(async (req: AuthenticatedRequest, res) => {
  const schema = z.object({
    title: z.string().min(1).max(200).optional(),
    description: z.string().optional().nullable(),
    status: z.enum(['TODO', 'IN_PROGRESS', 'IN_REVIEW', 'DONE', 'CANCELLED']).optional(),
    priority: z.enum(['LOW', 'MEDIUM', 'HIGH', 'URGENT']).optional(),
    assigneeId: z.string().optional().nullable(),
    workPackageId: z.string().optional().nullable(),
    milestoneId: z.string().optional().nullable(),
    startDate: z.date().optional().nullable(),
    dueDate: z.date().optional().nullable(),
    estimatedHours: z.number().positive().optional().nullable(),
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
      ...(data.status === 'DONE' && { completedAt: new Date() }),
    },
    include: {
      assignee: { select: { id: true, firstName: true, lastName: true, email: true, avatarUrl: true } },
      workPackage: { select: { id: true, name: true } },
      milestone: { select: { id: true, name: true } },
    },
  });

  // Determine activity type
  if (existingTask.assigneeId !== data.assigneeId && data.assigneeId) {
    await prisma.activity.create({
      data: {
        action: 'TASK_ASSIGNED',
        entityType: 'task',
        entityId: task.id,
        userId: req.user!.userId,
        projectId: task.projectId,
        metadata: { taskTitle: task.title, assigneeId: data.assigneeId },
      },
    });

    if (data.assigneeId !== req.user!.userId) {
      await prisma.notification.create({
        data: {
          userId: data.assigneeId,
          title: 'Task assigned to you',
          message: `You have been assigned to: ${task.title}`,
          link: `/projects/${task.projectId}/tasks/${task.id}`,
        },
      });
    }
  }

  if (data.status === 'DONE' && existingTask.status !== 'DONE') {
    await prisma.activity.create({
      data: {
        action: 'TASK_COMPLETED',
        entityType: 'task',
        entityId: task.id,
        userId: req.user!.userId,
        projectId: task.projectId,
        metadata: { taskTitle: task.title },
      },
    });
  }

  res.json({ task });
}));

// Delete task
router.delete('/:id', authenticate, asyncHandler(async (req: AuthenticatedRequest, res) => {
  await prisma.task.delete({
    where: { id: req.params.id },
  });

  res.json({ message: 'Task deleted successfully' });
}));

// Add comment
router.post('/:id/comments', authenticate, asyncHandler(async (req: AuthenticatedRequest, res) => {
  const schema = z.object({
    content: z.string().min(1),
  });

  const data = schema.parse(req.body);

  const task = await prisma.task.findUnique({
    where: { id: req.params.id },
    select: { id: true, title: true, projectId: true, assigneeId: true },
  });

  if (!task) {
    throw new AppError('Task not found', 404);
  }

  const comment = await prisma.comment.create({
    data: {
      content: data.content,
      taskId: req.params.id,
      userId: req.user!.userId,
    },
    include: {
      user: { select: { id: true, firstName: true, lastName: true, avatarUrl: true } },
    },
  });

  // Notify assignee if different from commenter
  if (task.assigneeId && task.assigneeId !== req.user!.userId) {
    await prisma.notification.create({
      data: {
        userId: task.assigneeId,
        title: 'New comment',
        message: `New comment on: ${task.title}`,
        link: `/projects/${task.projectId}/tasks/${task.id}`,
      },
    });
  }

  res.status(201).json({ comment });
}));

// Log time
router.post('/:id/log-time', authenticate, asyncHandler(async (req: AuthenticatedRequest, res) => {
  const schema = z.object({
    hours: z.number().positive(),
    description: z.string().optional(),
  });

  const data = schema.parse(req.body);

  const task = await prisma.task.update({
    where: { id: req.params.id },
    data: {
      loggedHours: { increment: data.hours },
    },
  });

  res.json({ task, loggedHours: task.loggedHours });
}));

// ============================================================================
// Task Dependencies
// ============================================================================

// Get task dependencies
router.get('/:id/dependencies', authenticate, asyncHandler(async (req: AuthenticatedRequest, res) => {
  const task = await prisma.task.findFirst({
    where: {
      id: req.params.id,
      project: {
        members: { some: { userId: req.user!.userId } },
      },
    },
    include: {
      dependencies: {
        include: {
          dependsOnTask: {
            select: {
              id: true,
              title: true,
              status: true,
              assignee: { select: { id: true, firstName: true, lastName: true } },
            },
          },
        },
      },
      dependents: {
        include: {
          task: {
            select: {
              id: true,
              title: true,
              status: true,
              assignee: { select: { id: true, firstName: true, lastName: true } },
            },
          },
        },
      },
    },
  });

  if (!task) {
    throw new AppError('Task not found', 404);
  }

  res.json({
    blocks: task.dependencies, // Tasks this task is blocked by
    blockedBy: task.dependents, // Tasks blocked by this task
  });
}));

// Add dependency (this task depends on another task)
router.post('/:id/dependencies', authenticate, asyncHandler(async (req: AuthenticatedRequest, res) => {
  const schema = z.object({
    dependsOnTaskId: z.string(),
  });

  const data = schema.parse(req.body);

  // Check if task exists
  const task = await prisma.task.findFirst({
    where: {
      id: req.params.id,
      project: {
        members: { some: { userId: req.user!.userId } },
      },
    },
  });

  if (!task) {
    throw new AppError('Task not found', 404);
  }

  // Check if dependency task exists in same project
  const dependencyTask = await prisma.task.findFirst({
    where: {
      id: data.dependsOnTaskId,
      projectId: task.projectId,
    },
  });

  if (!dependencyTask) {
    throw new AppError('Dependency task not found or not in same project', 404);
  }

  // Check for circular dependency
  const existingDependencies = await prisma.taskDependency.findMany({
    where: { taskId: data.dependsOnTaskId },
  });

  const dependencyIds = existingDependencies.map(d => d.dependsOnTaskId);
  if (dependencyIds.includes(req.params.id)) {
    throw new AppError('Cannot create circular dependency', 400);
  }

  // Check if dependency already exists
  const existing = await prisma.taskDependency.findUnique({
    where: {
      taskId_dependsOnTaskId: {
        taskId: req.params.id,
        dependsOnTaskId: data.dependsOnTaskId,
      },
    },
  });

  if (existing) {
    throw new AppError('Dependency already exists', 409);
  }

  const dependency = await prisma.taskDependency.create({
    data: {
      taskId: req.params.id,
      dependsOnTaskId: data.dependsOnTaskId,
    },
    include: {
      dependsOnTask: {
        select: { id: true, title: true, status: true },
      },
    },
  });

  res.status(201).json({ dependency });
}));

// Remove dependency
router.delete('/:id/dependencies/:dependsOnTaskId', authenticate, asyncHandler(async (req: AuthenticatedRequest, res) => {
  await prisma.taskDependency.delete({
    where: {
      taskId_dependsOnTaskId: {
        taskId: req.params.id,
        dependsOnTaskId: req.params.dependsOnTaskId,
      },
    },
  });

  res.json({ message: 'Dependency removed successfully' });
}));

export default router;
