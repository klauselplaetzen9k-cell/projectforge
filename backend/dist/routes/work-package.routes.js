"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const zod_1 = require("zod");
const prisma_1 = require("../lib/prisma");
const auth_middleware_1 = require("../middleware/auth.middleware");
const error_middleware_1 = require("../middleware/error.middleware");
const router = (0, express_1.Router)();
// Get work packages for a project
router.get('/project/:projectId', auth_middleware_1.authenticate, async (req, res) => {
    const workPackages = await prisma_1.prisma.workPackage.findMany({
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
router.post('/', auth_middleware_1.authenticate, async (req, res) => {
    const schema = zod_1.z.object({
        name: zod_1.z.string().min(1).max(200),
        description: zod_1.z.string().optional(),
        projectId: zod_1.z.string(),
        parentId: zod_1.z.string().optional(),
        status: zod_1.z.enum(['TODO', 'IN_PROGRESS', 'REVIEW', 'DONE', 'ARCHIVED']).optional(),
        priority: zod_1.z.enum(['LOW', 'MEDIUM', 'HIGH', 'URGENT']).optional(),
        startDate: zod_1.z.date().optional(),
        dueDate: zod_1.z.date().optional(),
    });
    const data = schema.parse(req.body);
    // Get next sort order
    const lastWP = await prisma_1.prisma.workPackage.findFirst({
        where: { projectId: data.projectId },
        orderBy: { sortOrder: 'desc' },
    });
    const workPackage = await prisma_1.prisma.workPackage.create({
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
router.get('/:id', auth_middleware_1.authenticate, async (req, res) => {
    const workPackage = await prisma_1.prisma.workPackage.findFirst({
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
        throw new error_middleware_1.AppError('Work package not found', 404);
    }
    // Calculate progress
    const completedTasks = workPackage.tasks.filter(t => t.status === 'DONE').length;
    const progress = workPackage.tasks.length > 0
        ? Math.round((completedTasks / workPackage.tasks.length) * 100)
        : 0;
    res.json({ workPackage: { ...workPackage, progress } });
});
// Update work package
router.put('/:id', auth_middleware_1.authenticate, async (req, res) => {
    const schema = zod_1.z.object({
        name: zod_1.z.string().min(1).max(200).optional(),
        description: zod_1.z.string().optional().nullable(),
        status: zod_1.z.enum(['TODO', 'IN_PROGRESS', 'REVIEW', 'DONE', 'ARCHIVED']).optional(),
        priority: zod_1.z.enum(['LOW', 'MEDIUM', 'HIGH', 'URGENT']).optional(),
        parentId: zod_1.z.string().optional().nullable(),
        startDate: zod_1.z.date().optional().nullable(),
        dueDate: zod_1.z.date().optional().nullable(),
        sortOrder: zod_1.z.number().optional(),
    });
    const data = schema.parse(req.body);
    const workPackage = await prisma_1.prisma.workPackage.update({
        where: { id: req.params.id },
        data,
        include: {
            parent: { select: { id: true, name: true } },
        },
    });
    res.json({ workPackage });
});
// Delete work package
router.delete('/:id', auth_middleware_1.authenticate, async (req, res) => {
    await prisma_1.prisma.workPackage.delete({
        where: { id: req.params.id },
    });
    res.json({ message: 'Work package deleted successfully' });
});
exports.default = router;
//# sourceMappingURL=work-package.routes.js.map