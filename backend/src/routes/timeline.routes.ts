import { Router, Request } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma';
import { authenticate } from '../middleware/auth.middleware';
import { asyncHandler, AppError } from '../middleware/error.middleware';

const router = Router();

// Get timelines for a project
router.get('/project/:projectId', authenticate, asyncHandler(async (req: Request, res) => {
  const timelines = await prisma.timeline.findMany({
    where: { projectId: req.params.projectId },
    orderBy: { isDefault: 'desc' },
  });

  res.json({ timelines });
}));

// Create timeline
router.post('/', authenticate, asyncHandler(async (req: Request, res) => {
  const schema = z.object({
    name: z.string().min(1).max(200),
    projectId: z.string(),
    startDate: z.date(),
    endDate: z.date(),
    isDefault: z.boolean().optional(),
  });

  const data = schema.parse(req.body);

  // If setting as default, unset other defaults
  if (data.isDefault) {
    await prisma.timeline.updateMany({
      where: { projectId: data.projectId },
      data: { isDefault: false },
    });
  }

  const timeline = await prisma.timeline.create({
    data,
  });

  res.status(201).json({ timeline });
}));

// Get single timeline
router.get('/:id', authenticate, asyncHandler(async (req: Request, res) => {
  const timeline = await prisma.timeline.findFirst({
    where: { id: req.params.id },
  });

  if (!timeline) {
    throw new AppError('Timeline not found', 404);
  }

  res.json({ timeline });
}));

// Update timeline
router.put('/:id', authenticate, asyncHandler(async (req: Request, res) => {
  const schema = z.object({
    name: z.string().min(1).max(200).optional(),
    startDate: z.date().optional(),
    endDate: z.date().optional(),
    isDefault: z.boolean().optional(),
  });

  const data = schema.parse(req.body);

  // If setting as default, unset other defaults
  if (data.isDefault) {
    const timeline = await prisma.timeline.findUnique({
      where: { id: req.params.id },
      select: { projectId: true },
    });

    if (timeline) {
      await prisma.timeline.updateMany({
        where: {
          projectId: timeline.projectId,
          id: { not: req.params.id },
        },
        data: { isDefault: false },
      });
    }
  }

  const timeline = await prisma.timeline.update({
    where: { id: req.params.id },
    data,
  });

  res.json({ timeline });
}));

// Delete timeline
router.delete('/:id', authenticate, asyncHandler(async (req: Request, res) => {
  await prisma.timeline.delete({
    where: { id: req.params.id },
  });

  res.json({ message: 'Timeline deleted successfully' });
}));

// Add event to timeline
router.post('/:id/events', authenticate, asyncHandler(async (req: Request, res) => {
  const schema = z.object({
    title: z.string().min(1).max(200),
    description: z.string().optional(),
    eventType: z.enum(['MILESTONE', 'DEADLINE', 'REVIEW', 'MEETING', 'RELEASE', 'CUSTOM']),
    startDate: z.date(),
    endDate: z.date().optional(),
    color: z.string().regex(/^#[0-9A-Fa-f]{6}$/).optional(),
  });

  const data = schema.parse(req.body);

  const event = await prisma.timelineEvent.create({
    data: {
      ...data,
      timelineId: req.params.id,
    },
  });

  res.status(201).json({ event });
}));

// Update timeline event
router.put('/:id/events/:eventId', authenticate, asyncHandler(async (req: Request, res) => {
  const schema = z.object({
    title: z.string().min(1).max(200).optional(),
    description: z.string().optional().nullable(),
    eventType: z.enum(['MILESTONE', 'DEADLINE', 'REVIEW', 'MEETING', 'RELEASE', 'CUSTOM']).optional(),
    startDate: z.date().optional(),
    endDate: z.date().optional().nullable(),
    color: z.string().regex(/^#[0-9A-Fa-f]{6}$/).optional().nullable(),
  });

  const data = schema.parse(req.body);

  const event = await prisma.timelineEvent.update({
    where: { id: req.params.eventId },
    data,
  });

  res.json({ event });
}));

// Delete timeline event
router.delete('/:id/events/:eventId', authenticate, asyncHandler(async (req: Request, res) => {
  await prisma.timelineEvent.delete({
    where: { id: req.params.eventId },
  });

  res.json({ message: 'Event deleted successfully' });
}));

// Get timeline data for Gantt chart
router.get('/:id/gantt', authenticate, asyncHandler(async (req: Request, res) => {
  const timeline = await prisma.timeline.findFirst({
    where: { id: req.params.id },
  });

  if (!timeline) {
    throw new AppError('Timeline not found', 404);
  }

  const events = await prisma.timelineEvent.findMany({
    where: { timelineId: timeline.id },
    orderBy: { startDate: 'asc' },
  });

  const milestones = await prisma.milestone.findMany({
    where: { projectId: timeline.projectId },
    orderBy: { dueDate: 'asc' },
  });

  const workPackages = await prisma.workPackage.findMany({
    where: { projectId: timeline.projectId },
  });

  const tasks = await prisma.task.findMany({
    where: {
      projectId: timeline.projectId,
      workPackageId: { in: workPackages.map(wp => wp.id) },
    },
  });

  res.json({ 
    timeline,
    events,
    milestones,
    workPackages,
    tasks,
  });
}));

export default router;
