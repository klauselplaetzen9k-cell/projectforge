"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const zod_1 = require("zod");
const prisma_1 = require("../lib/prisma");
const auth_middleware_1 = require("../middleware/auth.middleware");
const error_middleware_1 = require("../middleware/error.middleware");
const router = (0, express_1.Router)();
// Get all projects for user
router.get('/', auth_middleware_1.authenticate, (0, error_middleware_1.asyncHandler)(async (req, res) => {
    const projects = await prisma_1.prisma.project.findMany({
        where: {
            members: {
                some: { userId: req.user.userId },
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
router.post('/', auth_middleware_1.authenticate, (0, error_middleware_1.asyncHandler)(async (req, res) => {
    const schema = zod_1.z.object({
        name: zod_1.z.string().min(1).max(100),
        description: zod_1.z.string().optional(),
        key: zod_1.z.string().min(2).max(5).toUpperCase(),
        color: zod_1.z.string().regex(/^#[0-9A-Fa-f]{6}$/).optional(),
        teamId: zod_1.z.string(),
    });
    const data = schema.parse(req.body);
    // Check team membership
    const teamMember = await prisma_1.prisma.teamMember.findUnique({
        where: { teamId_userId: { teamId: data.teamId, userId: req.user.userId } },
    });
    if (!teamMember) {
        throw new error_middleware_1.AppError('You are not a member of this team', 403);
    }
    // Check if project key already exists in team
    const existingProject = await prisma_1.prisma.project.findFirst({
        where: { teamId: data.teamId, key: data.key },
    });
    if (existingProject) {
        throw new error_middleware_1.AppError('Project key already exists in this team', 409);
    }
    const project = await prisma_1.prisma.project.create({
        data: {
            name: data.name,
            description: data.description,
            key: data.key,
            color: data.color || '#6366f1',
            teamId: data.teamId,
            members: {
                create: {
                    userId: req.user.userId,
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
    await prisma_1.prisma.activity.create({
        data: {
            action: 'PROJECT_CREATED',
            entityType: 'project',
            entityId: project.id,
            userId: req.user.userId,
            projectId: project.id,
            metadata: { projectName: project.name },
        },
    });
    res.status(201).json({ project });
}));
// Get single project
router.get('/:id', auth_middleware_1.authenticate, (0, error_middleware_1.asyncHandler)(async (req, res) => {
    const project = await prisma_1.prisma.project.findFirst({
        where: {
            id: req.params.id,
            members: { some: { userId: req.user.userId } },
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
        throw new error_middleware_1.AppError('Project not found', 404);
    }
    res.json({ project });
}));
// Update project
router.put('/:id', auth_middleware_1.authenticate, (0, error_middleware_1.asyncHandler)(async (req, res) => {
    const schema = zod_1.z.object({
        name: zod_1.z.string().min(1).max(100).optional(),
        description: zod_1.z.string().optional().nullable(),
        color: zod_1.z.string().regex(/^#[0-9A-Fa-f]{6}$/).optional(),
        status: zod_1.z.enum(['ACTIVE', 'ON_HOLD', 'COMPLETED', 'ARCHIVED']).optional(),
        startDate: zod_1.z.date().optional().nullable(),
        endDate: zod_1.z.date().optional().nullable(),
    });
    const data = schema.parse(req.body);
    const project = await prisma_1.prisma.project.update({
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
router.delete('/:id', auth_middleware_1.authenticate, (0, error_middleware_1.asyncHandler)(async (req, res) => {
    await prisma_1.prisma.project.delete({
        where: { id: req.params.id },
    });
    res.json({ message: 'Project deleted successfully' });
}));
// Add project member
router.post('/:id/members', auth_middleware_1.authenticate, (0, error_middleware_1.asyncHandler)(async (req, res) => {
    const schema = zod_1.z.object({
        userId: zod_1.z.string(),
        role: zod_1.z.enum(['OWNER', 'MANAGER', 'MEMBER', 'VIEWER']).optional(),
    });
    const data = schema.parse(req.body);
    const member = await prisma_1.prisma.projectMember.create({
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
router.delete('/:id/members/:userId', auth_middleware_1.authenticate, (0, error_middleware_1.asyncHandler)(async (req, res) => {
    await prisma_1.prisma.projectMember.delete({
        where: {
            projectId_userId: {
                projectId: req.params.id,
                userId: req.params.userId,
            },
        },
    });
    res.json({ message: 'Member removed successfully' });
}));
exports.default = router;
//# sourceMappingURL=project.routes.js.map