import { Request, Response, NextFunction } from 'express';
/**
 * Authentication middleware
 * Verifies JWT token from Authorization header
 */
export declare function authenticate(req: Request, res: Response, next: NextFunction): Promise<void>;
/**
 * Authorization middleware factory
 * Creates middleware to check user roles
 */
export declare function authorize(...roles: string[]): (req: Request, res: Response, next: NextFunction) => void;
/**
 * Optional authentication middleware
 * Attaches user to request if token is valid, but doesn't require it
 */
export declare function optionalAuth(req: Request, res: Response, next: NextFunction): Promise<void>;
export declare const authenticateToken: typeof authenticate;
//# sourceMappingURL=auth.middleware.d.ts.map