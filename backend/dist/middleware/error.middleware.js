"use strict";
// ============================================================================
// Error Handling Middleware
// ============================================================================
Object.defineProperty(exports, "__esModule", { value: true });
exports.AppError = void 0;
exports.errorHandler = errorHandler;
exports.asyncHandler = asyncHandler;
const zod_1 = require("zod");
// Custom error class for operational errors
class AppError extends Error {
    statusCode;
    isOperational;
    constructor(message, statusCode = 500) {
        super(message);
        this.statusCode = statusCode;
        this.isOperational = true;
        Error.captureStackTrace(this, this.constructor);
    }
}
exports.AppError = AppError;
/**
 * Global error handler middleware
 * Catches and formats all errors from the application
 */
async function errorHandler(err, req, res, next) {
    // Log the error
    console.error('[ERROR]', {
        message: err.message,
        stack: process.env.NODE_ENV === 'development' ? err.stack : undefined,
        path: req.path,
        method: req.method,
    });
    // Handle Prisma errors
    if (err.name === 'PrismaClientKnownRequestError') {
        const prismaError = err;
        // Unique constraint violation
        if (prismaError.code === 'P2002') {
            const field = prismaError.meta?.target?.join('.') || 'field';
            res.status(409).json({
                error: 'A record with this value already exists',
                field,
            });
            return;
        }
        // Record not found
        if (prismaError.code === 'P2025') {
            res.status(404).json({
                error: 'Record not found',
            });
            return;
        }
        // Default Prisma error
        res.status(400).json({
            error: 'Database operation failed',
            code: prismaError.code,
        });
        return;
    }
    // Handle Zod validation errors
    if (err instanceof zod_1.ZodError) {
        res.status(400).json({
            error: 'Validation error',
            details: err.errors.map(e => ({
                field: e.path.join('.'),
                message: e.message,
                code: e.code,
            })),
        });
        return;
    }
    // Handle custom app errors
    if (err instanceof AppError) {
        res.status(err.statusCode).json({
            error: err.message,
        });
        return;
    }
    // Handle JWT errors
    if (err.name === 'JsonWebTokenError') {
        res.status(401).json({
            error: 'Invalid token',
        });
        return;
    }
    if (err.name === 'TokenExpiredError') {
        res.status(401).json({
            error: 'Token expired',
        });
        return;
    }
    // Default error response
    const statusCode = 500;
    const message = process.env.NODE_ENV === 'production'
        ? 'Internal server error'
        : err.message;
    res.status(statusCode).json({
        error: message,
        ...(process.env.NODE_ENV === 'development' && {
            stack: err.stack,
        }),
    });
}
/**
 * Async handler wrapper
 * Wraps async route handlers to catch errors
 * Uses any types to avoid AuthenticatedRequest conflicts with Express Request
 */
function asyncHandler(fn) {
    return (req, res, next) => {
        Promise.resolve(fn(req, res, next)).catch(next);
    };
}
//# sourceMappingURL=error.middleware.js.map