import { Request, Response, NextFunction } from 'express';
import { verifyToken, TokenPayload } from '../lib/auth';
import { prisma } from '../lib/prisma';

export interface AuthenticatedRequest extends Request {
  user?: TokenPayload & { id: string };
}

export async function authenticate(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'No token provided' });
    }

    const token = authHeader.substring(7);
    const payload = verifyToken(token);

    if (!payload) {
      return res.status(401).json({ error: 'Invalid or expired token' });
    }

    // Check if session exists and is valid
    const session = await prisma.userSession.findUnique({
      where: { token },
    });

    if (!session || session.expiresAt < new Date()) {
      return res.status(401).json({ error: 'Session expired' });
    }

    req.user = { ...payload, id: payload.userId };
    next();
  } catch (error) {
    next(error);
  }
}

export function authorize(...roles: string[]) {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ error: 'Insufficient permissions' });
    }

    next();
  };
}
