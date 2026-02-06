import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import rateLimit from 'express-rate-limit';
import dotenv from 'dotenv';

import authRoutes from './routes/auth.routes';
import projectRoutes from './routes/project.routes';
import teamRoutes from './routes/team.routes';
import taskRoutes from './routes/task.routes';
import workPackageRoutes from './routes/work-package.routes';
import milestoneRoutes from './routes/milestone.routes';
import timelineRoutes from './routes/timeline.routes';
import userRoutes from './routes/user.routes';
import { errorHandler } from './middleware/error.middleware';
import { notFoundHandler } from './middleware/not-found.middleware';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// Security middleware
app.use(helmet());
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:5173',
  credentials: true,
}));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: { error: 'Too many requests, please try again later.' },
});
app.use('/api/', limiter);

// Body parsing
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Logging
app.use(morgan('dev'));

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/projects', projectRoutes);
app.use('/api/teams', teamRoutes);
app.use('/api/tasks', taskRoutes);
app.use('/api/work-packages', workPackageRoutes);
app.use('/api/milestones', milestoneRoutes);
app.use('/api/timelines', timelineRoutes);
app.use('/api/users', userRoutes);

// Error handling
app.use(notFoundHandler);
app.use(errorHandler);

app.listen(PORT, () => {
  console.log(`🚀 ProjectForge API running on http://localhost:${PORT}`);
  console.log(`📝 Environment: ${process.env.NODE_ENV || 'development'}`);
});

export default app;
