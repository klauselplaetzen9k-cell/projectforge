"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const zod_1 = require("zod");
const prisma_1 = require("../lib/prisma");
const auth_middleware_1 = require("../middleware/auth.middleware");
const error_middleware_1 = require("../middleware/error.middleware");
const router = (0, express_1.Router)();
// Get timelines for a project
router.get('/project/:projectId', auth_middleware_1.authenticate, (0, error_middleware_1.asyncHandler)(async (req, res) => {
    const timelines = await prisma_1.prisma.timeline.findMany({
        where: { projectId: req.params.projectId },
        include: {
            events: {
                orderBy: { startDate: 'asc' },
            },
        },
        orderBy: { isDefault: 'desc' },
    });
    res.json({ timelines });
}));
// Create timeline
router.post('/', auth_middleware_1.authenticate, (0, error_middleware_1.asyncHandler)(async (req, res) => {
    const schema = zod_1.z.object({
        name: zod_1.z.string().min(1).max(200),
        projectId: zod_1.z.string(),
        startDate: zod_1.z.date(),
        endDate: zod_1.z.date(),
        isDefault: zod_1.z.boolean().optional(),
    });
    const data = schema.parse(req.body);
    // If setting as default, unset other defaults
    if (data.isDefault) {
        await prisma_1.prisma.timeline.updateMany({
            where: { projectId: data.projectId },
            data: { isDefault: false },
        });
    }
    const timeline = await prisma_1.prisma.timeline.create({
        data,
        include: {
            events: true,
        },
    });
    res.status(201).json({ timeline });
}));
// Get single timeline
router.get('/:id', auth_middleware_1.authenticate, (0, error_middleware_1.asyncHandler)(async (req, res) => {
    const timeline = await prisma_1.prisma.timeline.findFirst({
        where: { id: req.params.id },
        include: {
            project: { select: { id: true, name: true } },
            events: {
                orderBy: { startDate: 'asc' },
            },
        },
    });
    if (!timeline) {
        throw new error_middleware_1.AppError('Timeline not found', 404);
    }
    res.json({ timeline });
}));
// Update timeline
router.put('/:id', auth_middleware_1.authenticate, (0, error_middleware_1.asyncHandler)(async (req, res) => {
    const schema = zod_1.z.object({
        name: zod_1.z.string().min(1).max(200).optional(),
        startDate: zod_1.z.date().optional(),
        endDate: zod_1.z.date().optional(),
        isDefault: zod_1.z.boolean().optional(),
    });
    const data = schema.parse(req.body);
    // If setting as default, unset other defaults
    if (data.isDefault) {
        const timeline = await prisma_1.prisma.timeline.findUnique({
            where: { id: req.params.id },
            select: { projectId: true },
        });
        if (timeline) {
            await prisma_1.prisma.timeline.updateMany({
                where: {
                    projectId: timeline.projectId,
                    id: { not: req.params.id },
                },
                data: { isDefault: false },
            });
        }
    }
    const timeline = await prisma_1.prisma.timeline.update({
        where: { id: req.params.id },
        data,
        include: {
            events: true,
        },
    });
    res.json({ timeline });
}));
// Delete timeline
router.delete('/:id', auth_middleware_1.authenticate, (0, error_middleware_1.asyncHandler)(async (req, res) => {
    await prisma_1.prisma.timeline.delete({
        where: { id: req.params.id },
    });
    res.json({ message: 'Timeline deleted successfully' });
}));
// Add event to timeline
router.post('/:id/events', auth_middleware_1.authenticate, (0, error_middleware_1.asyncHandler)(async (req, res) => {
    const schema = zod_1.z.object({
        title: zod_1.z.string().min(1).max(200),
        description: zod_1.z.string().optional(),
        eventType: zod_1.z.enum(['MILESTONE', 'DEADLINE', 'REVIEW', 'MEETING', 'RELEASE', 'CUSTOM']),
        startDate: zod_1.z.date(),
        endDate: zod_1.z.date().optional(),
        color: zod_1.z.string().regex(/^#[0-9A-Fa-f]{6}$/).optional(),
    });
    const data = schema.parse(req.body);
    const event = await prisma_1.prisma.timelineEvent.create({
        data: {
            ...data,
            timelineId: req.params.id,
        },
    });
    res.status(201).json({ event });
}));
// Update timeline event
router.put('/:id/events/:eventId', auth_middleware_1.authenticate, (0, error_middleware_1.asyncHandler)(async (req, res) => {
    const schema = zod_1.z.object({
        title: zod_1.z.string().min(1).max(200).optional(),
        description: zod_1.z.string().optional().nullable(),
        eventType: zod_1.z.enum(['MILESTONE', 'DEADLINE', 'REVIEW', 'MEETING', 'RELEASE', 'CUSTOM']).optional(),
        startDate: zod_1.z.date().optional(),
        endDate: zod_1.z.date().optional().nullable(),
        color: zod_1.z.string().regex(/^#[0-9A-Fa-f]{6}$/).optional().nullable(),
    });
    const data = schema.parse(req.body);
    const event = await prisma_1.prisma.timelineEvent.update({
        where: { id: req.params.eventId },
        data,
    });
    res.json({ event });
}));
// Delete timeline event
router.delete('/:id/events/:eventId', auth_middleware_1.authenticate, (0, error_middleware_1.asyncHandler)(async (req, res) => {
    await prisma_1.prisma.timelineEvent.delete({
        where: { id: req.params.eventId },
    });
    res.json({ message: 'Event deleted successfully' });
}));
// Get timeline data for Gantt chart
router.get('/:id/gantt', auth_middleware_1.authenticate, (0, error_middleware_1.asyncHandler)(async (req, res) => {
    const timeline = await prisma_1.prisma.timeline.findFirst({
        where: { id: req.params.id },
        include: {
            events: {
                orderBy: { startDate: 'asc' },
            },
            project: {
                include: {
                    milestones: {
                        orderBy: { dueDate: 'asc' },
                    },
                    workPackages: {
                        where: {
                            OR: [
                                { startDate: { gte: timeline.startDate } },
                                { dueDate: { lte: timeline.endDate } },
                                { startDate: { lte: timeline.endDate }, dueDate: { gte: timeline.startDate } },
                            ],
                        },
                        include: {
                            tasks: {
                                where: {
                                    OR: [
                                        { startDate: { gte: timeline.startDate } },
                                        { dueDate: { lte: timeline.endDate } },
                                        { startDate: { lte: timeline.endDate }, dueDate: { gte: timeline.startDate } },
                                    ],
                                },
                                select: { id: true, title: true, status: true, startDate: true, dueDate: true, assigneeId: true },
                            },
                        },
                    },
                },
            },
        },
    });
    if (!timeline) {
        throw new error_middleware_1.AppError('Timeline not found', 404);
    }
    res.json({ timeline });
}));
exports.default = router;
//# sourceMappingURL=timeline.routes.js.map