"use strict";
// ============================================================================
// Authentication Routes
// ============================================================================
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const zod_1 = require("zod");
const prisma_1 = require("../lib/prisma");
const auth_1 = require("../lib/auth");
const auth_middleware_1 = require("../middleware/auth.middleware");
const error_middleware_1 = require("../middleware/error.middleware");
const router = (0, express_1.Router)();
// ============================================================================
// Validation Schemas
// ============================================================================
const registerSchema = zod_1.z.object({
    email: zod_1.z.string().email('Invalid email address'),
    password: zod_1.z.string().min(8, 'Password must be at least 8 characters'),
    firstName: zod_1.z.string().min(1, 'First name is required').max(50),
    lastName: zod_1.z.string().min(1, 'Last name is required').max(50),
});
const loginSchema = zod_1.z.object({
    email: zod_1.z.string().email('Invalid email address'),
    password: zod_1.z.string().min(1, 'Password is required'),
});
const refreshSchema = zod_1.z.object({
    refreshToken: zod_1.z.string().min(1, 'Refresh token is required'),
});
// ============================================================================
// POST /api/auth/register
// ============================================================================
router.post('/register', (0, error_middleware_1.asyncHandler)(async (req, res) => {
    const data = registerSchema.parse(req.body);
    // Check if user already exists
    const existingUser = await prisma_1.prisma.user.findUnique({
        where: { email: data.email },
    });
    if (existingUser) {
        throw new error_middleware_1.AppError('Email already registered', 409);
    }
    // Create user
    const user = await prisma_1.prisma.user.create({
        data: {
            email: data.email,
            passwordHash: await (0, auth_1.hashPassword)(data.password),
            firstName: data.firstName,
            lastName: data.lastName,
        },
        select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
            role: true,
            createdAt: true,
        },
    });
    // Generate tokens
    const tokens = (0, auth_1.generateTokenPair)({
        userId: user.id,
        email: user.email,
        role: user.role,
    });
    // Create session
    await (0, auth_1.createUserSession)(user.id, tokens.refreshToken, req.ip, req.get('user-agent'), tokens.accessToken);
    res.status(201).json({
        message: 'Registration successful',
        user,
        ...tokens,
    });
}));
// ============================================================================
// POST /api/auth/login
// ============================================================================
router.post('/login', (0, error_middleware_1.asyncHandler)(async (req, res) => {
    const data = loginSchema.parse(req.body);
    // Validate credentials
    const result = await (0, auth_1.validateCredentials)(data.email, data.password);
    if (!result) {
        throw new error_middleware_1.AppError('Invalid credentials', 401);
    }
    if (result.error) {
        throw new error_middleware_1.AppError(result.error, 403);
    }
    if (!result.user) {
        throw new error_middleware_1.AppError('User not found', 404);
    }
    const user = result.user;
    // Update last login
    await prisma_1.prisma.user.update({
        where: { id: user.id },
        data: { lastLoginAt: new Date() },
    });
    // Generate tokens
    const tokens = (0, auth_1.generateTokenPair)({
        userId: user.id,
        email: user.email,
        role: user.role,
    });
    // Create session
    await (0, auth_1.createUserSession)(user.id, tokens.refreshToken, req.ip, req.get('user-agent'), tokens.accessToken);
    res.json({
        message: 'Login successful',
        user: {
            id: user.id,
            email: user.email,
            firstName: user.firstName,
            lastName: user.lastName,
            role: user.role,
        },
        ...tokens,
    });
}));
// ============================================================================
// POST /api/auth/refresh
// ============================================================================
router.post('/refresh', (0, error_middleware_1.asyncHandler)(async (req, res) => {
    const data = refreshSchema.parse(req.body);
    // Verify refresh token
    const payload = (0, auth_1.verifyRefreshToken)(data.refreshToken);
    if (!payload) {
        throw new error_middleware_1.AppError('Invalid refresh token', 401);
    }
    // Check if session exists and is valid
    const session = await (0, auth_1.getSessionByRefreshToken)(data.refreshToken);
    if (!session) {
        throw new error_middleware_1.AppError('Session not found', 401);
    }
    // Generate new tokens
    const tokens = (0, auth_1.generateTokenPair)({
        userId: payload.userId,
        email: payload.email,
        role: payload.role,
    });
    // Update session with new tokens
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 30);
    await prisma_1.prisma.userSession.update({
        where: { id: session.id },
        data: {
            token: tokens.refreshToken,
            accessToken: tokens.accessToken,
            expiresAt,
        },
    });
    res.json({
        message: 'Token refreshed successfully',
        ...tokens,
    });
}));
// ============================================================================
// POST /api/auth/logout
// ============================================================================
router.post('/logout', auth_middleware_1.authenticate, (0, error_middleware_1.asyncHandler)(async (req, res) => {
    const authHeader = req.headers.authorization;
    const accessToken = authHeader?.substring(7);
    if (accessToken) {
        // Invalidate this session
        await (0, auth_1.invalidateSession)(accessToken);
    }
    res.json({ message: 'Logged out successfully' });
}));
// ============================================================================
// POST /api/auth/logout-all
// ============================================================================
router.post('/logout-all', auth_middleware_1.authenticate, (0, error_middleware_1.asyncHandler)(async (req, res) => {
    await (0, auth_1.invalidateAllUserSessions)(req.user.userId);
    res.json({ message: 'All sessions logged out successfully' });
}));
// ============================================================================
// GET /api/auth/sessions
// ============================================================================
router.get('/sessions', auth_middleware_1.authenticate, (0, error_middleware_1.asyncHandler)(async (req, res) => {
    const sessions = await (0, auth_1.getUserSessions)(req.user.userId);
    res.json({ sessions });
}));
// ============================================================================
// GET /api/auth/me
// ============================================================================
router.get('/me', auth_middleware_1.authenticate, (0, error_middleware_1.asyncHandler)(async (req, res) => {
    const user = await prisma_1.prisma.user.findUnique({
        where: { id: req.user.userId },
        select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
            avatarUrl: true,
            role: true,
            createdAt: true,
            lastLoginAt: true,
        },
    });
    if (!user) {
        throw new error_middleware_1.AppError('User not found', 404);
    }
    res.json({ user });
}));
// ============================================================================
// Export
// ============================================================================
exports.default = router;
//# sourceMappingURL=auth.routes.js.map