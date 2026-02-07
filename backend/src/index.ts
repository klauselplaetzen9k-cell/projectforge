// ============================================================================
// ProjectForge Backend Entry Point
// ============================================================================

import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import rateLimit from 'express-rate-limit';
import dotenv from 'dotenv';
import multer from 'multer';

// Make multer available globally for routes
declare global {
  namespace Express {
    interface Request {
      files?: {
        [fieldname: string]: Express.Multer.File[];
      } | Express.Multer.File[];
    }
  }
}

// Configure multer for file uploads
const upload = multer({
  storage: multer.memoryStorage(),
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
    } else {
      cb(new Error('Invalid file type'));
    }
  },
});

// Load environment variables
dotenv.config();

// Import routes
import authRoutes from './routes/auth.routes';
import projectRoutes from './routes/project.routes';
import teamRoutes from './routes/team.routes';
import taskRoutes from './routes/task.routes';
import workPackageRoutes from './routes/work-package.routes';
import milestoneRoutes from './routes/milestone.routes';
import timelineRoutes from './routes/timeline.routes';
import userRoutes from './routes/user.routes';
import attachmentRoutes from './routes/attachment.routes';
import notificationRoutes from './routes/notification.routes';

// Import middleware
import { errorHandler } from './middleware/error.middleware';
import { notFoundHandler } from './middleware/not-found.middleware';

// Create Express application
const app = express();
const PORT = process.env.PORT || 3000;

// ============================================================================
// SECURITY MIDDLEWARE
// ============================================================================

// Helmet - Security headers
app.use(helmet({
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
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:5173',
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));

// Rate limiting - Prevent abuse
const limiter = rateLimit({
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
app.use(express.json({
  limit: '10mb',
}));

// Parse URL-encoded bodies
app.use(express.urlencoded({
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

app.use(morgan(logFormat, {
  stream: {
    write: (message: string) => {
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
app.use('/api/auth', authRoutes);

// Project routes
app.use('/api/projects', projectRoutes);

// Team routes
app.use('/api/teams', teamRoutes);

// Task routes
app.use('/api/tasks', taskRoutes);

// Work package routes
app.use('/api/work-packages', workPackageRoutes);

// Milestone routes
app.use('/api/milestones', milestoneRoutes);

// Timeline routes
app.use('/api/timelines', timelineRoutes);

// User routes
app.use('/api/users', userRoutes);

// Attachment routes (with file upload middleware)
app.use('/api/attachments', upload.single('file'), attachmentRoutes);

// Notification routes (Mattermost integration)
app.use('/api/notifications', notificationRoutes);

// ============================================================================
// ERROR HANDLING
// ============================================================================

// 404 handler
app.use(notFoundHandler);

// Global error handler
app.use(errorHandler);

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
process.on('unhandledRejection', (reason: Error) => {
  console.error('[ERROR] Unhandled Promise Rejection:', reason);
});

// Handle uncaught exceptions
process.on('uncaughtException', (error: Error) => {
  console.error('[ERROR] Uncaught Exception:', error);
  process.exit(1);
});

export default app;
