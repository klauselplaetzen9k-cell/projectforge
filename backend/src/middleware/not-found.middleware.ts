// ============================================================================
// 404 Not Found Handler
// ============================================================================

import { Request, Response } from 'express';

/**
 * Handles requests to non-existent routes
 */
export function notFoundHandler(req: Request, res: Response): void {
  res.status(404).json({
    error: 'Not Found',
    message: `Route ${req.method} ${req.originalUrl} not found`,
    path: req.originalUrl,
    method: req.method,
    suggestion: 'Check the API documentation for available routes.',
  });
}
