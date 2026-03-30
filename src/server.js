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
const isProduction = String(process.env.NODE_ENV || '').toLowerCase() === 'production';

if (String(process.env.TRUST_PROXY || 'false').toLowerCase() === 'true') {
  app.set('trust proxy', 1);
}


const allowedOrigins = new Set([
  'https://app.sunacare.org',
  'https://admin.sunacare.org',
  'https://responder.sunacare.org',
  'http://localhost:3000',
  'http://localhost:3001',
  'http://localhost:3002',
]);

function isAllowedOrigin(origin) {
  if (!origin) return true;
  if (allowedOrigins.has(origin)) return true;
  if (/^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/i.test(origin)) return true;
  return false;
}

app.use(
  cors({
    origin: (origin, callback) => {
      if (isAllowedOrigin(origin)) {
        return callback(null, true);
      }

      return callback(new Error(`CORS blocked for origin: ${origin}`));
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  })
);

// function isAllowedOrigin(origin) {
//   if (!origin) return true;
//   if (allowedOrigins.has(origin)) return true;
//   if (/^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/i.test(origin)) return true;
//   return false;
// }

app.use(helmet({
  crossOriginResourcePolicy: { policy: 'cross-origin' },
}));
app.use(hpp());

const rateLimitWindowMinutes = Number.parseInt(process.env.RATE_LIMIT_WINDOW_MS || '15', 10);
const rateLimitMaxRequests = Number.parseInt(
  process.env.RATE_LIMIT_MAX_REQUESTS || (isProduction ? '500' : '5000'),
  10
);

// Global rate limiter for general API requests.
app.use(rateLimit({
  windowMs: rateLimitWindowMinutes * 60 * 1000,
  max: rateLimitMaxRequests,
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => req.method === 'OPTIONS' || req.path === '/health' || req.path.startsWith('/api/auth'),
  message: {
    success: false,
    message: 'Too many requests. Please wait a moment and try again.',
  },
}));

// More lenient rate limiter specifically for auth endpoints to allow retries.
const authLimiter = rateLimit({
  windowMs: rateLimitWindowMinutes * 60 * 1000,
  max: isProduction ? 100 : 1000,
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: true,
  message: {
    success: false,
    message: 'Too many failed login attempts. Please wait a moment and try again.',
  },
});

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

app.use('/api/auth', authLimiter, authRoutes);
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

async function ensureOtpUpdatedAtDefault() {
  try {
    const qi = sequelize.getQueryInterface();
    const table = await qi.describeTable('otp_verifications');
    const updatedAt = table?.updated_at;

    // Some existing databases have updated_at as NOT NULL without default,
    // which breaks inserts because OTP model does not manage updated_at.
    if (!updatedAt) return;

    const hasCurrentTimestampDefault = String(updatedAt.defaultValue || '')
      .toUpperCase()
      .includes('CURRENT_TIMESTAMP');

    if (updatedAt.allowNull === false && !hasCurrentTimestampDefault) {
      await sequelize.query(`
        UPDATE otp_verifications
        SET updated_at = created_at
        WHERE updated_at IS NULL
      `);

      await sequelize.query(`
        ALTER TABLE otp_verifications
        MODIFY COLUMN updated_at DATETIME NOT NULL
        DEFAULT CURRENT_TIMESTAMP
        ON UPDATE CURRENT_TIMESTAMP
      `);

      logger.info('Repaired otp_verifications.updated_at default');
    }
  } catch (err) {
    logger.warn('Skipped otp_verifications.updated_at guard:', err?.message || err);
  }
}

async function ensurePostCommentParentColumn() {
  try {
    const qi = sequelize.getQueryInterface();
    const table = await qi.describeTable('post_comments');

    if (!table?.parent_comment_id) {
      await sequelize.query(`
        ALTER TABLE post_comments
        ADD COLUMN parent_comment_id INT UNSIGNED NULL AFTER author_id
      `);
      logger.info('Added post_comments.parent_comment_id column');
    }

    const [indexes] = await sequelize.query('SHOW INDEX FROM post_comments');
    const hasParentIndex = Array.isArray(indexes)
      && indexes.some((index) => String(index?.Key_name || '').toLowerCase() === 'idx_parent_comment_id');

    if (!hasParentIndex) {
      await sequelize.query('ALTER TABLE post_comments ADD INDEX idx_parent_comment_id (parent_comment_id)');
      logger.info('Added post_comments.idx_parent_comment_id index');
    }

    const [constraints] = await sequelize.query(`
      SELECT CONSTRAINT_NAME
      FROM information_schema.KEY_COLUMN_USAGE
      WHERE TABLE_SCHEMA = DATABASE()
        AND TABLE_NAME = 'post_comments'
        AND COLUMN_NAME = 'parent_comment_id'
        AND REFERENCED_TABLE_NAME = 'post_comments'
    `);
    const hasParentFk = Array.isArray(constraints) && constraints.length > 0;

    if (!hasParentFk) {
      await sequelize.query(`
        ALTER TABLE post_comments
        ADD CONSTRAINT fk_post_comments_parent
        FOREIGN KEY (parent_comment_id)
        REFERENCES post_comments(id)
        ON DELETE CASCADE
      `);
      logger.info('Added post_comments parent comment foreign key');
    }
  } catch (err) {
    logger.warn('Skipped post_comments.parent_comment_id guard:', err?.message || err);
  }
}

async function start() {
  try {
    await sequelize.authenticate();
    logger.info('Database connected');

    await ensureOtpUpdatedAtDefault();
    await ensurePostCommentParentColumn();

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
