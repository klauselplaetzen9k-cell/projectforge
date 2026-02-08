"use strict";
// ============================================================================
// Authentication Library
// ============================================================================
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.hashPassword = hashPassword;
exports.verifyPassword = verifyPassword;
exports.generateAccessToken = generateAccessToken;
exports.generateRefreshToken = generateRefreshToken;
exports.generateTokenPair = generateTokenPair;
exports.verifyAccessToken = verifyAccessToken;
exports.verifyRefreshToken = verifyRefreshToken;
exports.createUserSession = createUserSession;
exports.invalidateSession = invalidateSession;
exports.invalidateAllUserSessions = invalidateAllUserSessions;
exports.getSessionByRefreshToken = getSessionByRefreshToken;
exports.getUserSessions = getUserSessions;
exports.validateCredentials = validateCredentials;
exports.createUser = createUser;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const prisma_1 = require("../lib/prisma");
// ============================================================================
// Configuration
// ============================================================================
const JWT_SECRET = process.env.JWT_SECRET || 'your-super-secret-jwt-key-change-in-production';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '7d';
const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || 'your-refresh-token-secret-change-in-production';
const JWT_REFRESH_EXPIRES_IN = process.env.JWT_REFRESH_EXPIRES_IN || '30d';
// ============================================================================
// Password Functions
// ============================================================================
/**
 * Hash a password using bcrypt
 */
async function hashPassword(password) {
    const rounds = parseInt(process.env.BCRYPT_ROUNDS || '12');
    return bcryptjs_1.default.hash(password, rounds);
}
/**
 * Verify a password against a hash
 */
async function verifyPassword(password, hash) {
    return bcryptjs_1.default.compare(password, hash);
}
// ============================================================================
// Token Functions
// ============================================================================
/**
 * Generate an access token
 */
function generateAccessToken(payload) {
    return jsonwebtoken_1.default.sign(payload, JWT_SECRET, {
        expiresIn: JWT_EXPIRES_IN,
    });
}
/**
 * Generate a refresh token
 */
function generateRefreshToken(payload) {
    return jsonwebtoken_1.default.sign(payload, JWT_REFRESH_SECRET, {
        expiresIn: JWT_REFRESH_EXPIRES_IN,
    });
}
/**
 * Generate both access and refresh tokens
 */
function generateTokenPair(payload) {
    const accessToken = generateAccessToken(payload);
    const refreshToken = generateRefreshToken(payload);
    // Calculate expiresIn in seconds
    const expiresIn = jsonwebtoken_1.default.decode(accessToken);
    const expiresInSeconds = expiresIn.exp - Math.floor(Date.now() / 1000);
    return {
        accessToken,
        refreshToken,
        expiresIn: expiresInSeconds,
    };
}
/**
 * Verify an access token
 */
function verifyAccessToken(token) {
    try {
        return jsonwebtoken_1.default.verify(token, JWT_SECRET);
    }
    catch {
        return null;
    }
}
/**
 * Verify a refresh token
 */
function verifyRefreshToken(token) {
    try {
        return jsonwebtoken_1.default.verify(token, JWT_REFRESH_SECRET);
    }
    catch {
        return null;
    }
}
// ============================================================================
// Session Functions
// ============================================================================
/**
 * Create a new user session with refresh token
 */
async function createUserSession(userId, refreshToken, ipAddress, userAgent, accessToken) {
    const expiresAt = new Date();
    // Refresh token expires in 30 days
    expiresAt.setDate(expiresAt.getDate() + 30);
    return prisma_1.prisma.userSession.create({
        data: {
            userId,
            token: refreshToken, // Store refresh token
            accessToken, // Optional: store access token for immediate invalidation
            expiresAt,
            ipAddress,
            userAgent,
        },
    });
}
/**
 * Invalidate a specific session
 */
async function invalidateSession(token) {
    return prisma_1.prisma.userSession.deleteMany({
        where: { token },
    });
}
/**
 * Invalidate all sessions for a user
 */
async function invalidateAllUserSessions(userId) {
    return prisma_1.prisma.userSession.deleteMany({
        where: { userId },
    });
}
/**
 * Get session by refresh token
 */
async function getSessionByRefreshToken(refreshToken) {
    const session = await prisma_1.prisma.userSession.findUnique({
        where: { token: refreshToken },
        include: { user: true },
    });
    if (!session || session.expiresAt < new Date()) {
        return null;
    }
    return session;
}
/**
 * Get all active sessions for a user
 */
async function getUserSessions(userId) {
    return prisma_1.prisma.userSession.findMany({
        where: {
            userId,
            expiresAt: { gt: new Date() },
        },
        orderBy: { createdAt: 'desc' },
        select: {
            id: true,
            ipAddress: true,
            userAgent: true,
            createdAt: true,
            expiresAt: true,
        },
    });
}
// ============================================================================
// User Functions
// ============================================================================
/**
 * Validate user credentials
 */
async function validateCredentials(email, password) {
    const user = await prisma_1.prisma.user.findUnique({
        where: { email },
    });
    if (!user || !user.passwordHash) {
        return null;
    }
    if (!user.isActive) {
        return { error: 'Account is deactivated' };
    }
    const validPassword = await verifyPassword(password, user.passwordHash);
    if (!validPassword) {
        return null;
    }
    return { user };
}
/**
 * Create a new user
 */
async function createUser(data) {
    const passwordHash = await hashPassword(data.password);
    return prisma_1.prisma.user.create({
        data: {
            email: data.email,
            passwordHash,
            firstName: data.firstName,
            lastName: data.lastName,
        },
    });
}
//# sourceMappingURL=auth.js.map