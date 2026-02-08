"use strict";
// ============================================================================
// 404 Not Found Handler
// ============================================================================
Object.defineProperty(exports, "__esModule", { value: true });
exports.notFoundHandler = notFoundHandler;
/**
 * Handles requests to non-existent routes
 */
function notFoundHandler(req, res) {
    res.status(404).json({
        error: 'Not Found',
        message: `Route ${req.method} ${req.originalUrl} not found`,
        path: req.originalUrl,
        method: req.method,
        suggestion: 'Check the API documentation for available routes.',
    });
}
//# sourceMappingURL=not-found.middleware.js.map