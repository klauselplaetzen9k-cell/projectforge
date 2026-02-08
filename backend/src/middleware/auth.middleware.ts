// ============================================================================
// Authentication Middleware
// ============================================================================

import { Request, Response, NextFunction } from 'express';
import { verifyToken, TokenPayload } from '../lib/auth';
import { prisma } from '../lib/prisma';

/**
 * Authentication middleware
 * Verifies JWT token from Authorization header
 */
export async function authenticate(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
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
    const payload = verifyToken(token);

    if (!payload) {
      res.status(401).json({ error: 'Invalid or expired token' });
      return;
    }

    // Check if session exists and is valid
    const session = await prisma.userSession.findUnique({
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
  } catch (error) {
    next(error);
  }
}

/**
 * Authorization middleware factory
 * Creates middleware to check user roles
 */
export function authorize(...roles: string[]) {
  return (req: Request, res: Response, next: NextFunction): void => {
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
export async function optionalAuth(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      next();
      return;
    }

    const token = authHeader.substring(7);
    const payload = verifyToken(token);

    if (payload) {
      req.user = { ...payload, id: payload.userId };
    }

    next();
  } catch (error) {
    // Silently fail for optional auth
    next();
  }
}

// Alias for backwards compatibility
export const authenticateToken = authenticate;
