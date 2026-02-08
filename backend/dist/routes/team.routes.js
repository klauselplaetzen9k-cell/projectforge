"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const zod_1 = require("zod");
const prisma_1 = require("../lib/prisma");
const auth_middleware_1 = require("../middleware/auth.middleware");
const error_middleware_1 = require("../middleware/error.middleware");
const router = (0, express_1.Router)();
// Get all teams for user
router.get('/', auth_middleware_1.authenticate, (0, error_middleware_1.asyncHandler)(async (req, res) => {
    const teams = await prisma_1.prisma.team.findMany({
        where: {
            members: { some: { userId: req.user.userId } },
        },
        include: {
            owner: { select: { id: true, firstName: true, lastName: true, email: true } },
            members: {
                include: {
                    user: { select: { id: true, firstName: true, lastName: true, email: true, avatarUrl: true } },
                },
            },
            _count: { select: { projects: true } },
        },
        orderBy: { name: 'asc' },
    });
    res.json({ teams });
}));
// Create team
router.post('/', auth_middleware_1.authenticate, (0, error_middleware_1.asyncHandler)(async (req, res) => {
    const schema = zod_1.z.object({
        name: zod_1.z.string().min(1).max(100),
        description: zod_1.z.string().optional(),
    });
    const data = schema.parse(req.body);
    // Generate slug from name
    const slug = data.name
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/(^-|-$)/g, '');
    const team = await prisma_1.prisma.team.create({
        data: {
            name: data.name,
            description: data.description,
            slug,
            ownerId: req.user.userId,
            members: {
                create: {
                    userId: req.user.userId,
                    role: 'OWNER',
                },
            },
        },
        include: {
            owner: { select: { id: true, firstName: true, lastName: true, email: true } },
            members: {
                include: {
                    user: { select: { id: true, firstName: true, lastName: true, email: true } },
                },
            },
        },
    });
    res.status(201).json({ team });
}));
// Get single team
router.get('/:id', auth_middleware_1.authenticate, (0, error_middleware_1.asyncHandler)(async (req, res) => {
    const team = await prisma_1.prisma.team.findFirst({
        where: {
            id: req.params.id,
            members: { some: { userId: req.user.userId } },
        },
        include: {
            owner: { select: { id: true, firstName: true, lastName: true, email: true } },
            members: {
                include: {
                    user: { select: { id: true, firstName: true, lastName: true, email: true, avatarUrl: true } },
                },
            },
            projects: {
                include: {
                    _count: { select: { workPackages: true, milestones: true } },
                },
            },
        },
    });
    if (!team) {
        throw new error_middleware_1.AppError('Team not found', 404);
    }
    res.json({ team });
}));
// Update team
router.put('/:id', auth_middleware_1.authenticate, (0, error_middleware_1.asyncHandler)(async (req, res) => {
    const schema = zod_1.z.object({
        name: zod_1.z.string().min(1).max(100).optional(),
        description: zod_1.z.string().optional().nullable(),
        avatarUrl: zod_1.z.string().url().optional().nullable(),
    });
    const data = schema.parse(req.body);
    const team = await prisma_1.prisma.team.update({
        where: { id: req.params.id },
        data,
        include: {
            owner: { select: { id: true, firstName: true, lastName: true, email: true } },
            members: {
                include: {
                    user: { select: { id: true, firstName: true, lastName: true, email: true } },
                },
            },
        },
    });
    res.json({ team });
}));
// Delete team
router.delete('/:id', auth_middleware_1.authenticate, (0, error_middleware_1.asyncHandler)(async (req, res) => {
    await prisma_1.prisma.team.delete({
        where: { id: req.params.id },
    });
    res.json({ message: 'Team deleted successfully' });
}));
// Add team member
router.post('/:id/members', auth_middleware_1.authenticate, (0, error_middleware_1.asyncHandler)(async (req, res) => {
    const schema = zod_1.z.object({
        email: zod_1.z.string().email(),
        role: zod_1.z.enum(['OWNER', 'ADMIN', 'MEMBER', 'VIEWER']).optional(),
    });
    const data = schema.parse(req.body);
    // Find user by email
    const user = await prisma_1.prisma.user.findUnique({
        where: { email: data.email },
    });
    if (!user) {
        throw new error_middleware_1.AppError('User not found', 404);
    }
    const member = await prisma_1.prisma.teamMember.create({
        data: {
            teamId: req.params.id,
            userId: user.id,
            role: data.role || 'MEMBER',
        },
        include: {
            user: { select: { id: true, firstName: true, lastName: true, email: true } },
        },
    });
    res.status(201).json({ member });
}));
// Remove team member
router.delete('/:id/members/:userId', auth_middleware_1.authenticate, (0, error_middleware_1.asyncHandler)(async (req, res) => {
    await prisma_1.prisma.teamMember.delete({
        where: {
            teamId_userId: {
                teamId: req.params.id,
                userId: req.params.userId,
            },
        },
    });
    res.json({ message: 'Member removed successfully' });
}));
exports.default = router;
//# sourceMappingURL=team.routes.js.map