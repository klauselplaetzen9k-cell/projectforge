"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const zod_1 = require("zod");
const prisma_1 = require("../lib/prisma");
const auth_middleware_1 = require("../middleware/auth.middleware");
const error_middleware_1 = require("../middleware/error.middleware");
const router = (0, express_1.Router)();
// Get tasks for a project
router.get('/project/:projectId', auth_middleware_1.authenticate, (0, error_middleware_1.asyncHandler)(async (req, res) => {
    const tasks = await prisma_1.prisma.task.findMany({
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
router.get('/my', auth_middleware_1.authenticate, (0, error_middleware_1.asyncHandler)(async (req, res) => {
    const { status, projectId } = req.query;
    // Build where clause with proper types
    const where = {
        assigneeId: req.user.userId,
    };
    if (status && typeof status === 'string') {
        where.status = status;
    }
    if (projectId && typeof projectId === 'string') {
        where.projectId = projectId;
    }
    const tasks = await prisma_1.prisma.task.findMany({
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
router.post('/', auth_middleware_1.authenticate, (0, error_middleware_1.asyncHandler)(async (req, res) => {
    const schema = zod_1.z.object({
        title: zod_1.z.string().min(1).max(200),
        description: zod_1.z.string().optional(),
        projectId: zod_1.z.string(),
        workPackageId: zod_1.z.string().optional(),
        milestoneId: zod_1.z.string().optional(),
        assigneeId: zod_1.z.string().optional(),
        priority: zod_1.z.enum(['LOW', 'MEDIUM', 'HIGH', 'URGENT']).optional(),
        estimatedHours: zod_1.z.number().positive().optional(),
        startDate: zod_1.z.date().optional(),
        dueDate: zod_1.z.date().optional(),
    });
    const data = schema.parse(req.body);
    // Check project membership
    const projectMember = await prisma_1.prisma.projectMember.findUnique({
        where: { projectId_userId: { projectId: data.projectId, userId: req.user.userId } },
    });
    if (!projectMember) {
        throw new error_middleware_1.AppError('You are not a member of this project', 403);
    }
    // Get next sort order
    const lastTask = await prisma_1.prisma.task.findFirst({
        where: { projectId: data.projectId },
        orderBy: { sortOrder: 'desc' },
    });
    const task = await prisma_1.prisma.task.create({
        data: {
            title: data.title,
            description: data.description,
            projectId: data.projectId,
            workPackageId: data.workPackageId,
            milestoneId: data.milestoneId,
            assigneeId: data.assigneeId,
            creatorId: req.user.userId,
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
    await prisma_1.prisma.activity.create({
        data: {
            action: 'TASK_CREATED',
            entityType: 'Task',
            entityId: task.id,
            userId: req.user.userId,
            projectId: task.projectId,
            taskId: task.id,
        },
    });
    res.status(201).json({ task });
}));
// Get single task
router.get('/:id', auth_middleware_1.authenticate, (0, error_middleware_1.asyncHandler)(async (req, res) => {
    const task = await prisma_1.prisma.task.findFirst({
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
        throw new error_middleware_1.AppError('Task not found', 404);
    }
    res.json({ task });
}));
// Update task
router.put('/:id', auth_middleware_1.authenticate, (0, error_middleware_1.asyncHandler)(async (req, res) => {
    const schema = zod_1.z.object({
        title: zod_1.z.string().min(1).max(200).optional(),
        description: zod_1.z.string().optional().nullable(),
        status: zod_1.z.enum(['TODO', 'IN_PROGRESS', 'IN_REVIEW', 'DONE', 'CANCELLED']).optional(),
        priority: zod_1.z.enum(['LOW', 'MEDIUM', 'HIGH', 'URGENT']).optional(),
        assigneeId: zod_1.z.string().optional().nullable(),
        estimatedHours: zod_1.z.number().positive().optional().nullable(),
        loggedHours: zod_1.z.number().min(0).optional(),
        startDate: zod_1.z.date().optional().nullable(),
        dueDate: zod_1.z.date().optional().nullable(),
        sortOrder: zod_1.z.number().optional(),
    });
    const data = schema.parse(req.body);
    const existingTask = await prisma_1.prisma.task.findUnique({
        where: { id: req.params.id },
    });
    if (!existingTask) {
        throw new error_middleware_1.AppError('Task not found', 404);
    }
    const task = await prisma_1.prisma.task.update({
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
    await prisma_1.prisma.activity.create({
        data: {
            action: 'TASK_UPDATED',
            entityType: 'Task',
            entityId: task.id,
            userId: req.user.userId,
            projectId: task.projectId,
            taskId: task.id,
        },
    });
    res.json({ task });
}));
// Reorder tasks
router.put('/reorder', auth_middleware_1.authenticate, (0, error_middleware_1.asyncHandler)(async (req, res) => {
    const schema = zod_1.z.object({
        projectId: zod_1.z.string(),
        taskUpdates: zod_1.z.array(zod_1.z.object({
            id: zod_1.z.string(),
            sortOrder: zod_1.z.number(),
            status: zod_1.z.enum(['TODO', 'IN_PROGRESS', 'IN_REVIEW', 'DONE', 'CANCELLED']).optional(),
        })),
    });
    const { projectId, taskUpdates } = schema.parse(req.body);
    // Check project membership
    const projectMember = await prisma_1.prisma.projectMember.findUnique({
        where: { projectId_userId: { projectId, userId: req.user.userId } },
    });
    if (!projectMember) {
        throw new error_middleware_1.AppError('You are not a member of this project', 403);
    }
    // Update all tasks
    await prisma_1.prisma.$transaction(taskUpdates.map(update => prisma_1.prisma.task.update({
        where: { id: update.id },
        data: {
            sortOrder: update.sortOrder,
            ...(update.status && { status: update.status }),
        },
    })));
    res.json({ message: 'Tasks reordered successfully' });
}));
// Assign task
router.put('/:id/assign', auth_middleware_1.authenticate, (0, error_middleware_1.asyncHandler)(async (req, res) => {
    const schema = zod_1.z.object({
        assigneeId: zod_1.z.string().nullable(),
    });
    const { assigneeId } = schema.parse(req.body);
    const task = await prisma_1.prisma.task.update({
        where: { id: req.params.id },
        data: { assigneeId },
        include: {
            assignee: { select: { id: true, firstName: true, lastName: true, email: true, avatarUrl: true } },
        },
    });
    // Log activity
    await prisma_1.prisma.activity.create({
        data: {
            action: 'TASK_ASSIGNED',
            entityType: 'Task',
            entityId: task.id,
            userId: req.user.userId,
            projectId: task.projectId,
            taskId: task.id,
            metadata: { assigneeId },
        },
    });
    res.json({ task });
}));
// Delete task
router.delete('/:id', auth_middleware_1.authenticate, (0, error_middleware_1.asyncHandler)(async (req, res) => {
    const task = await prisma_1.prisma.task.findUnique({
        where: { id: req.params.id },
    });
    if (!task) {
        throw new error_middleware_1.AppError('Task not found', 404);
    }
    await prisma_1.prisma.task.delete({
        where: { id: req.params.id },
    });
    res.json({ message: 'Task deleted successfully' });
}));
exports.default = router;
//# sourceMappingURL=task.routes.js.map