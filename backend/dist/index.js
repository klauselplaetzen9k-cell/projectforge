"use strict";
// ============================================================================
// ProjectForge Backend Entry Point
// ============================================================================
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const helmet_1 = __importDefault(require("helmet"));
const morgan_1 = __importDefault(require("morgan"));
const express_rate_limit_1 = __importDefault(require("express-rate-limit"));
const dotenv_1 = __importDefault(require("dotenv"));
const multer_1 = __importDefault(require("multer"));
// Configure multer for file uploads
const upload = (0, multer_1.default)({
    storage: multer_1.default.memoryStorage(),
    limits: {
        fileSize: 10 * 1024 * 1024, // 10MB limit
    },
    fileFilter: (req, file, cb) => {
        // Allow common file types
        const allowedTypes = [
            'application/pdf',
            'application/msword',
            'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
            'application/vnd.ms-excel',
            'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            'image/png',
            'image/jpeg',
            'image/gif',
            'image/svg+xml',
            'text/plain',
            'text/csv',
            'application/zip',
            'application/json',
        ];
        if (allowedTypes.includes(file.mimetype)) {
            cb(null, true);
        }
        else {
            cb(new Error('Invalid file type'));
        }
    },
});
// Load environment variables
dotenv_1.default.config();
// Import routes
const auth_routes_1 = __importDefault(require("./routes/auth.routes"));
const project_routes_1 = __importDefault(require("./routes/project.routes"));
const team_routes_1 = __importDefault(require("./routes/team.routes"));
const task_routes_1 = __importDefault(require("./routes/task.routes"));
const work_package_routes_1 = __importDefault(require("./routes/work-package.routes"));
const milestone_routes_1 = __importDefault(require("./routes/milestone.routes"));
const timeline_routes_1 = __importDefault(require("./routes/timeline.routes"));
const user_routes_1 = __importDefault(require("./routes/user.routes"));
const attachment_routes_1 = __importDefault(require("./routes/attachment.routes"));
const notification_routes_1 = __importDefault(require("./routes/notification.routes"));
// Import middleware
const error_middleware_1 = require("./middleware/error.middleware");
const not_found_middleware_1 = require("./middleware/not-found.middleware");
// Create Express application
const app = (0, express_1.default)();
const PORT = process.env.PORT || 3000;
// ============================================================================
// SECURITY MIDDLEWARE
// ============================================================================
// Helmet - Security headers
app.use((0, helmet_1.default)({
    contentSecurityPolicy: {
        directives: {
            defaultSrc: ["'self'"],
            styleSrc: ["'self'", "'unsafe-inline'"],
            scriptSrc: ["'self'"],
            imgSrc: ["'self'", 'data:', 'https:'],
        },
    },
    crossOriginEmbedderPolicy: false,
}));
// CORS - Cross-Origin Resource Sharing
app.use((0, cors_1.default)({
    origin: process.env.FRONTEND_URL || 'http://localhost:5173',
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
}));
// Rate limiting - Prevent abuse
const limiter = (0, express_rate_limit_1.default)({
    windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900000'), // 15 minutes
    max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '100'), // 100 requests per window
    message: {
        error: 'Too many requests, please try again later.',
        retryAfter: Math.ceil(parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900000') / 1000),
    },
    standardHeaders: true,
    legacyHeaders: false,
});
app.use('/api/', limiter);
// ============================================================================
// BODY PARSING
// ============================================================================
// Parse JSON bodies
app.use(express_1.default.json({
    limit: '10mb',
}));
// Parse URL-encoded bodies
app.use(express_1.default.urlencoded({
    extended: true,
    limit: '10mb',
}));
// ============================================================================
// LOGGING
// ============================================================================
// Morgan - HTTP request logging
const logFormat = process.env.NODE_ENV === 'production'
    ? 'combined'
    : 'dev';
app.use((0, morgan_1.default)(logFormat, {
    stream: {
        write: (message) => {
            // Remove trailing newline for cleaner logs
            const logMessage = message.trim();
            if (logMessage) {
                console.log(`[${new Date().toISOString()}] ${logMessage}`);
            }
        },
    },
}));
// ============================================================================
// HEALTH CHECK
// ============================================================================
app.get('/health', (req, res) => {
    res.json({
        status: 'ok',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        environment: process.env.NODE_ENV || 'development',
    });
});
// ============================================================================
// API ROUTES
// ============================================================================
// Authentication routes
app.use('/api/auth', auth_routes_1.default);
// Project routes
app.use('/api/projects', project_routes_1.default);
// Team routes
app.use('/api/teams', team_routes_1.default);
// Task routes
app.use('/api/tasks', task_routes_1.default);
// Work package routes
app.use('/api/work-packages', work_package_routes_1.default);
// Milestone routes
app.use('/api/milestones', milestone_routes_1.default);
// Timeline routes
app.use('/api/timelines', timeline_routes_1.default);
// User routes
app.use('/api/users', user_routes_1.default);
// Attachment routes (with file upload middleware)
app.use('/api/attachments', upload.single('file'), attachment_routes_1.default);
// Notification routes (Mattermost integration)
app.use('/api/notifications', notification_routes_1.default);
// ============================================================================
// ERROR HANDLING
// ============================================================================
// 404 handler
app.use(not_found_middleware_1.notFoundHandler);
// Global error handler
app.use(error_middleware_1.errorHandler);
// ============================================================================
// SERVER STARTUP
// ============================================================================
app.listen(PORT, () => {
    console.log('╔════════════════════════════════════════════════════════════╗');
    console.log('║                    ProjectForge API                        ║');
    console.log('╠════════════════════════════════════════════════════════════╣');
    console.log(`║  🚀 Server running on: http://localhost:${PORT}                ║`);
    console.log(`║  📝 Environment: ${(process.env.NODE_ENV || 'development').padEnd(31)}║`);
    console.log(`║  🔗 API Base URL: http://localhost:${PORT}/api               ║`);
    console.log(`║  ❤️  Health Check: http://localhost:${PORT}/health            ║`);
    console.log('╚════════════════════════════════════════════════════════════╝');
});
// Handle unhandled promise rejections
process.on('unhandledRejection', (reason) => {
    console.error('[ERROR] Unhandled Promise Rejection:', reason);
});
// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
    console.error('[ERROR] Uncaught Exception:', error);
    process.exit(1);
});
exports.default = app;
//# sourceMappingURL=index.js.map