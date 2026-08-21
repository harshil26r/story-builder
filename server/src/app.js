import express from 'express';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import session from 'express-session';
import MongoStore from 'connect-mongo';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default async function createApp(mongoUri, options = {}) {
  const { disableRateLimits = false } = options;
  const app = express();
  // Global kill-switch for rate limiters — used by tests to avoid cross-file
  // singleton exhaustion. All limiters check this module flag (rateLimit.js).
  const rateLimitModule = await import('./middleware/rateLimit.js');
  rateLimitModule.setRateLimitsEnabled(!disableRateLimits);

  // Security
  app.use(helmet());

  // Body parsing
  app.use(express.json({ limit: '2mb' }));
  app.use(cookieParser());

  // Session
  const SEVEN_DAYS = 7 * 24 * 60 * 60;
  app.use(session({
    secret: process.env.SESSION_SECRET || 'dev-secret-change-me',
    name: 'connect.sid',
    resave: false,
    saveUninitialized: false,
    rolling: true,
    cookie: {
      httpOnly: true,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
      maxAge: SEVEN_DAYS * 1000,
    },
    store: MongoStore.create({
      mongoUrl: mongoUri || process.env.MONGO_URI || 'mongodb://127.0.0.1/story-builder',
      ttl: SEVEN_DAYS,
      collectionName: 'sessions',
      autoRemove: 'native',
    }),
  }));

  // Global rate limit (100/min/IP) — SPEC §7.2
  const { globalLimiter } = await import('./middleware/rateLimit.js');
  if (!disableRateLimits) {
    app.use(globalLimiter);
  }

  // CSRF token endpoint
  const { csrfToken } = await import('./middleware/csrf.js');
  app.get('/api/auth/csrf', csrfToken);

  // Health check
  app.get('/api/health', (_req, res) => {
    res.json({ ok: true, timestamp: new Date().toISOString() });
  });

  // Local-fallback file serving (SPEC §3.5): server/uploads → /uploads/**
  app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

  // API routes
  const authRoutes = await import('./routes/auth.routes.js');
  app.use('/api/auth', authRoutes.default);

  const uploadRoutes = await import('./routes/upload.routes.js');
  app.use('/api/upload', uploadRoutes.default);

  const characterRoutes = await import('./routes/character.routes.js');
  app.use('/api/characters', characterRoutes.default);

  // Central error handler
  const errorHandler = await import('./middleware/errorHandler.js');
  app.use(errorHandler.default);

  return app;
}
