import { Request, Response, NextFunction } from 'express';
import { TokenPayload } from '../lib/auth';
export interface AuthenticatedRequest extends Request {
    user?: TokenPayload & {
        id: string;
    };
}
/**
 * Authentication middleware
 * Verifies JWT token from Authorization header
 */
export declare function authenticate(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void>;
/**
 * Authorization middleware factory
 * Creates middleware to check user roles
 */
export declare function authorize(...roles: string[]): (req: AuthenticatedRequest, res: Response, next: NextFunction) => void;
/**
 * Optional authentication middleware
 * Attaches user to request if token is valid, but doesn't require it
 */
export declare function optionalAuth(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void>;
//# sourceMappingURL=auth.middleware.d.ts.map