"use strict";
// ============================================================================
// Authentication Middleware
// ============================================================================
Object.defineProperty(exports, "__esModule", { value: true });
exports.authenticateToken = void 0;
exports.authenticate = authenticate;
exports.authorize = authorize;
exports.optionalAuth = optionalAuth;
const auth_1 = require("../lib/auth");
const prisma_1 = require("../lib/prisma");
/**
 * Authentication middleware
 * Verifies JWT token from Authorization header
 */
async function authenticate(req, res, next) {
    try {
        // Get authorization header
        const authHeader = req.headers.authorization;
        if (!authHeader) {
            res.status(401).json({ error: 'No authorization header' });
            return;
        }
        // Check Bearer token format
        if (!authHeader.startsWith('Bearer ')) {
            res.status(401).json({ error: 'Invalid authorization format' });
            return;
        }
        // Extract token
        const token = authHeader.substring(7);
        if (!token) {
            res.status(401).json({ error: 'No token provided' });
            return;
        }
        // Verify token
        const payload = (0, auth_1.verifyToken)(token);
        if (!payload) {
            res.status(401).json({ error: 'Invalid or expired token' });
            return;
        }
        // Check if session exists and is valid
        const session = await prisma_1.prisma.userSession.findUnique({
            where: { token },
            include: { user: true },
        });
        if (!session) {
            res.status(401).json({ error: 'Session not found' });
            return;
        }
        if (session.expiresAt < new Date()) {
            res.status(401).json({ error: 'Session expired' });
            return;
        }
        if (!session.user.isActive) {
            res.status(403).json({ error: 'Account is deactivated' });
            return;
        }
        // Attach user to request
        req.user = { ...payload, id: payload.userId };
        next();
    }
    catch (error) {
        next(error);
    }
}
/**
 * Authorization middleware factory
 * Creates middleware to check user roles
 */
function authorize(...roles) {
    return (req, res, next) => {
        if (!req.user) {
            res.status(401).json({ error: 'Not authenticated' });
            return;
        }
        if (!roles.includes(req.user.role)) {
            res.status(403).json({
                error: 'Insufficient permissions',
                required: roles,
                current: req.user.role,
            });
            return;
        }
        next();
    };
}
/**
 * Optional authentication middleware
 * Attaches user to request if token is valid, but doesn't require it
 */
async function optionalAuth(req, res, next) {
    try {
        const authHeader = req.headers.authorization;
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            next();
            return;
        }
        const token = authHeader.substring(7);
        const payload = (0, auth_1.verifyToken)(token);
        if (payload) {
            req.user = { ...payload, id: payload.userId };
        }
        next();
    }
    catch (error) {
        // Silently fail for optional auth
        next();
    }
}
// Alias for backwards compatibility
exports.authenticateToken = authenticate;
//# sourceMappingURL=auth.middleware.js.map