"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const zod_1 = require("zod");
const prisma_1 = require("../lib/prisma");
const auth_middleware_1 = require("../middleware/auth.middleware");
const error_middleware_1 = require("../middleware/error.middleware");
const auth_1 = require("../lib/auth");
const router = (0, express_1.Router)();
// Search users (for assigning to tasks/teams)
router.get('/search', auth_middleware_1.authenticate, (0, error_middleware_1.asyncHandler)(async (req, res) => {
    const { q } = req.query;
    if (!q || typeof q !== 'string' || q.length < 2) {
        return res.json({ users: [] });
    }
    const users = await prisma_1.prisma.user.findMany({
        where: {
            AND: [
                { isActive: true },
                {
                    OR: [
                        { email: { contains: q.toLowerCase() } },
                        { firstName: { contains: q, mode: 'insensitive' } },
                        { lastName: { contains: q, mode: 'insensitive' } },
                    ],
                },
            ],
        },
        select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
            avatarUrl: true,
        },
        take: 10,
    });
    res.json({ users });
}));
// Get all users (admin only)
router.get('/', auth_middleware_1.authenticate, (0, error_middleware_1.asyncHandler)(async (req, res) => {
    const { role, isActive, search } = req.query;
    const users = await prisma_1.prisma.user.findMany({
        where: {
            ...(role && { role: role }),
            ...(isActive !== undefined && { isActive: isActive === 'true' }),
            ...(search && {
                OR: [
                    { email: { contains: String(search), mode: 'insensitive' } },
                    { firstName: { contains: String(search), mode: 'insensitive' } },
                    { lastName: { contains: String(search), mode: 'insensitive' } },
                ],
            }),
        },
        select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
            avatarUrl: true,
            role: true,
            isActive: true,
            createdAt: true,
            lastLoginAt: true,
            _count: {
                select: {
                    assignedTasks: true,
                    teamMemberships: true,
                },
            },
        },
        orderBy: { createdAt: 'desc' },
    });
    res.json({ users });
}));
// Get user by ID
router.get('/:id', auth_middleware_1.authenticate, (0, error_middleware_1.asyncHandler)(async (req, res) => {
    const user = await prisma_1.prisma.user.findUnique({
        where: { id: req.params.id },
        select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
            avatarUrl: true,
            role: true,
            isActive: true,
            createdAt: true,
            lastLoginAt: true,
            teamMemberships: {
                include: {
                    team: { select: { id: true, name: true, slug: true } },
                },
            },
            _count: {
                select: {
                    assignedTasks: true,
                    createdTasks: true,
                },
            },
        },
    });
    if (!user) {
        throw new error_middleware_1.AppError('User not found', 404);
    }
    res.json({ user });
}));
// Update profile (own profile)
router.put('/profile', auth_middleware_1.authenticate, (0, error_middleware_1.asyncHandler)(async (req, res) => {
    const schema = zod_1.z.object({
        firstName: zod_1.z.string().min(1).max(50).optional(),
        lastName: zod_1.z.string().min(1).max(50).optional(),
        avatarUrl: zod_1.z.string().url().optional().nullable(),
    });
    const data = schema.parse(req.body);
    const user = await prisma_1.prisma.user.update({
        where: { id: req.user.userId },
        data,
        select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
            avatarUrl: true,
            role: true,
        },
    });
    res.json({ user });
}));
// Change password
router.put('/change-password', auth_middleware_1.authenticate, (0, error_middleware_1.asyncHandler)(async (req, res) => {
    const schema = zod_1.z.object({
        currentPassword: zod_1.z.string(),
        newPassword: zod_1.z.string().min(8),
    });
    const data = schema.parse(req.body);
    const user = await prisma_1.prisma.user.findUnique({
        where: { id: req.user.userId },
        select: { passwordHash: true },
    });
    if (!user || !user.passwordHash) {
        throw new error_middleware_1.AppError('Cannot change password for OAuth users', 400);
    }
    const { verifyPassword } = await import('../lib/auth');
    const validPassword = await verifyPassword(data.currentPassword, user.passwordHash);
    if (!validPassword) {
        throw new error_middleware_1.AppError('Current password is incorrect', 401);
    }
    const newPasswordHash = await (0, auth_1.hashPassword)(data.newPassword);
    await prisma_1.prisma.user.update({
        where: { id: req.user.userId },
        data: { passwordHash: newPasswordHash },
    });
    res.json({ message: 'Password changed successfully' });
}));
// Get notifications
router.get('/notifications', auth_middleware_1.authenticate, (0, error_middleware_1.asyncHandler)(async (req, res) => {
    const { unreadOnly, limit } = req.query;
    const notifications = await prisma_1.prisma.notification.findMany({
        where: {
            userId: req.user.userId,
            ...(unreadOnly === 'true' && { isRead: false }),
        },
        orderBy: { createdAt: 'desc' },
        take: limit ? parseInt(String(limit)) : 50,
    });
    const unreadCount = await prisma_1.prisma.notification.count({
        where: {
            userId: req.user.userId,
            isRead: false,
        },
    });
    res.json({ notifications, unreadCount });
}));
// Mark notification as read
router.put('/notifications/:id/read', auth_middleware_1.authenticate, (0, error_middleware_1.asyncHandler)(async (req, res) => {
    await prisma_1.prisma.notification.update({
        where: { id: req.params.id },
        data: { isRead: true },
    });
    res.json({ success: true });
}));
// Mark all notifications as read
router.put('/notifications/read-all', auth_middleware_1.authenticate, (0, error_middleware_1.asyncHandler)(async (req, res) => {
    await prisma_1.prisma.notification.updateMany({
        where: {
            userId: req.user.userId,
            isRead: false,
        },
        data: { isRead: true },
    });
    res.json({ success: true });
}));
// Admin: Update user role
router.put('/:id/role', auth_middleware_1.authenticate, (0, error_middleware_1.asyncHandler)(async (req, res) => {
    const schema = zod_1.z.object({
        role: zod_1.z.enum(['ADMIN', 'MANAGER', 'MEMBER', 'VIEWER']),
    });
    const data = schema.parse(req.body);
    const user = await prisma_1.prisma.user.update({
        where: { id: req.params.id },
        data: { role: data.role },
        select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
            role: true,
        },
    });
    res.json({ user });
}));
// Admin: Deactivate user
router.put('/:id/deactivate', auth_middleware_1.authenticate, (0, error_middleware_1.asyncHandler)(async (req, res) => {
    await prisma_1.prisma.user.update({
        where: { id: req.params.id },
        data: { isActive: false },
    });
    res.json({ message: 'User deactivated successfully' });
}));
// Admin: Reactivate user
router.put('/:id/activate', auth_middleware_1.authenticate, (0, error_middleware_1.asyncHandler)(async (req, res) => {
    await prisma_1.prisma.user.update({
        where: { id: req.params.id },
        data: { isActive: true },
    });
    res.json({ message: 'User activated successfully' });
}));
exports.default = router;
//# sourceMappingURL=user.routes.js.map