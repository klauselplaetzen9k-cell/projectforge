import { Request, Response, NextFunction } from 'express';
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
 */
export declare function asyncHandler(fn: (req: Request, res: Response, next: NextFunction) => Promise<any>): (req: Request, res: Response, next: NextFunction) => void;
//# sourceMappingURL=error.middleware.d.ts.map