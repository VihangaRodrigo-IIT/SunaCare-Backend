import 'dotenv/config';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import hpp from 'hpp';
import compression from 'compression';
import cookieParser from 'cookie-parser';
import morgan from 'morgan';
import rateLimit from 'express-rate-limit';

import { sequelize } from './config/database.js';
import './models/index.js';

import authRoutes from './routes/auth.routes.js';
import userRoutes from './routes/user.routes.js';
import ngoRoutes from './routes/ngo.routes.js';
import reportRoutes from './routes/report.routes.js';
import petRoutes from './routes/pet.routes.js';
import campaignRoutes from './routes/campaign.routes.js';
import postRoutes from './routes/post.routes.js';
import articleRoutes from './routes/article.routes.js';
import dashboardRoutes from './routes/dashboard.routes.js';
import petReportRoutes from './routes/petReport.routes.js';
import mapRoutes from './routes/map.routes.js';
import settingsRoutes from './routes/settings.routes.js';

import { notFound } from './middleware/notFound.middleware.js';
import { errorHandler } from './middleware/error.middleware.js';
import { logger } from './utils/logger.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 5000;

const allowedOrigins = new Set(
  (process.env.ALLOWED_ORIGINS || 'http://localhost:3000,http://localhost:3001,http://localhost:3002')
    .split(',')
    .map((value) => value.trim())
    .filter(Boolean),
);

function isAllowedOrigin(origin) {
  if (!origin) return true;
  if (allowedOrigins.has(origin)) return true;
  if (/^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/i.test(origin)) return true;
  return false;
}

app.use(helmet({
  crossOriginResourcePolicy: { policy: 'cross-origin' },
}));
app.use(hpp());
app.use(cors({
  origin: (origin, callback) => {
    if (isAllowedOrigin(origin)) return callback(null, true);
    return callback(new Error(`CORS blocked for origin: ${origin}`));
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));
app.use(rateLimit({
  windowMs: Number.parseInt(process.env.RATE_LIMIT_WINDOW_MS || '15', 10) * 60 * 1000,
  max: Number.parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '500', 10),
  standardHeaders: true,
  legacyHeaders: false,
}));

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(compression());

if (process.env.NODE_ENV !== 'test') app.use(morgan('dev'));

app.use('/uploads', express.static(path.join(__dirname, '..', 'uploads')));

app.get('/health', (_req, res) => res.json({ status: 'ok', env: process.env.NODE_ENV }));
app.get('/api', (_req, res) => res.json({
  success: true,
  message: 'Sunacare API is running',
  version: '1.0.0',
  endpoints: [
    '/api/auth',
    '/api/users',
    '/api/ngos',
    '/api/reports',
    '/api/pets',
    '/api/pet-reports',
    '/api/campaigns',
    '/api/posts',
    '/api/articles',
    '/api/dashboard',
    '/api/map',
  ],
}));

app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/ngos', ngoRoutes);
app.use('/api/reports', reportRoutes);
app.use('/api/pets', petRoutes);
app.use('/api/campaigns', campaignRoutes);
app.use('/api/posts', postRoutes);
app.use('/api/articles', articleRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/pet-reports', petReportRoutes);
app.use('/api/map', mapRoutes);
app.use('/api/settings', settingsRoutes);

app.use(notFound);
app.use(errorHandler);

async function start() {
  try {
    await sequelize.authenticate();
    logger.info('Database connected');

    if (process.env.DB_SYNC === 'true') {
      await sequelize.sync({ alter: true });
      logger.info('Database synced');
    }

    app.listen(PORT, () => logger.info(`Server running on port ${PORT}`));
  } catch (err) {
    logger.error('Startup error:', err);
    process.exit(1);
  }
}

await start();
