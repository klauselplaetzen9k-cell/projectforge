"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const zod_1 = require("zod");
const prisma_1 = require("../lib/prisma");
const auth_middleware_1 = require("../middleware/auth.middleware");
const error_middleware_1 = require("../middleware/error.middleware");
const router = (0, express_1.Router)();
// Get milestones for a project
router.get('/project/:projectId', auth_middleware_1.authenticate, (0, error_middleware_1.asyncHandler)(async (req, res) => {
    const milestones = await prisma_1.prisma.milestone.findMany({
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
router.post('/', auth_middleware_1.authenticate, (0, error_middleware_1.asyncHandler)(async (req, res) => {
    const schema = zod_1.z.object({
        name: zod_1.z.string().min(1).max(200),
        description: zod_1.z.string().optional(),
        projectId: zod_1.z.string(),
        workPackageId: zod_1.z.string().optional(),
        dueDate: zod_1.z.date(),
    });
    const data = schema.parse(req.body);
    const milestone = await prisma_1.prisma.milestone.create({
        data,
        include: {
            workPackage: { select: { id: true, name: true } },
        },
    });
    res.status(201).json({ milestone });
}));
// Get single milestone
router.get('/:id', auth_middleware_1.authenticate, (0, error_middleware_1.asyncHandler)(async (req, res) => {
    const milestone = await prisma_1.prisma.milestone.findFirst({
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
        throw new error_middleware_1.AppError('Milestone not found', 404);
    }
    const completedTasks = milestone.tasks.filter(t => t.status === 'DONE').length;
    const progress = milestone.tasks.length > 0
        ? Math.round((completedTasks / milestone.tasks.length) * 100)
        : 0;
    res.json({ milestone: { ...milestone, progress, completedTasks } });
}));
// Update milestone
router.put('/:id', auth_middleware_1.authenticate, (0, error_middleware_1.asyncHandler)(async (req, res) => {
    const schema = zod_1.z.object({
        name: zod_1.z.string().min(1).max(200).optional(),
        description: zod_1.z.string().optional().nullable(),
        dueDate: zod_1.z.date().optional(),
        completed: zod_1.z.boolean().optional(),
    });
    const data = schema.parse(req.body);
    const milestone = await prisma_1.prisma.milestone.update({
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
        await prisma_1.prisma.activity.create({
            data: {
                action: 'MILESTONE_COMPLETED',
                entityType: 'milestone',
                entityId: milestone.id,
                userId: req.user.userId,
                projectId: milestone.projectId,
                metadata: { milestoneName: milestone.name },
            },
        });
    }
    res.json({ milestone });
}));
// Delete milestone
router.delete('/:id', auth_middleware_1.authenticate, (0, error_middleware_1.asyncHandler)(async (req, res) => {
    await prisma_1.prisma.milestone.delete({
        where: { id: req.params.id },
    });
    res.json({ message: 'Milestone deleted successfully' });
}));
// Add task to milestone
router.post('/:id/tasks', auth_middleware_1.authenticate, (0, error_middleware_1.asyncHandler)(async (req, res) => {
    const schema = zod_1.z.object({
        taskId: zod_1.z.string(),
    });
    const data = schema.parse(req.body);
    const milestone = await prisma_1.prisma.milestone.update({
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
router.delete('/:id/tasks/:taskId', auth_middleware_1.authenticate, (0, error_middleware_1.asyncHandler)(async (req, res) => {
    const milestone = await prisma_1.prisma.milestone.update({
        where: { id: req.params.id },
        data: {
            tasks: {
                disconnect: { id: req.params.taskId },
            },
        },
    });
    res.json({ milestone });
}));
exports.default = router;
//# sourceMappingURL=milestone.routes.js.map