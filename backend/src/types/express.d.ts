import { TokenPayload } from '../lib/auth';

// Type augmentation for Express Request to include user property
declare global {
  namespace Express {
    interface Request {
      user?: TokenPayload & { id: string };
    }
  }
}

export {};
