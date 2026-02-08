// Type augmentation for Express Request
import { TokenPayload } from '../lib/auth';

declare global {
  namespace Express {
    interface Request {
      user?: TokenPayload & { id: string };
    }
  }
}
