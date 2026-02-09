import { Request, Response, NextFunction, RequestHandler } from 'express';
export declare class AppError extends Error {
    statusCode: number;
    isOperational: boolean;
    constructor(message: string, statusCode?: number);
}
/**
 * Global error handler middleware
 * Catches and formats all errors from the application
 */
export declare function errorHandler(err: Error, req: Request, res: Response, next: NextFunction): Promise<void>;
/**
 * Async handler wrapper
 * Wraps async route handlers to catch errors
 * Uses any types to avoid AuthenticatedRequest conflicts with Express Request
 */
export declare function asyncHandler(fn: (req: any, res: any, next: any) => Promise<any>): RequestHandler;
//# sourceMappingURL=error.middleware.d.ts.map