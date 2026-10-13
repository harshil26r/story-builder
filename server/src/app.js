import express from 'express';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import session from 'express-session';
import path from 'path';
import { fileURLToPath } from 'url';
import createSessionMiddleware from './config/session.js';
import cors from './middleware/cors.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default async function createApp(mongoUri, options = {}) {
  const { disableRateLimits = false } = options;

  // Refuse to boot in production with the shared dev secret (session fixation
  // / cookie forgery). Tests and local dev keep the documented fallback.
  if (process.env.NODE_ENV === 'production' && !process.env.SESSION_SECRET) {
    throw new Error('SESSION_SECRET must be set when NODE_ENV=production.');
  }

  const app = express();

  // Behind a reverse proxy (nginx/load balancer) the real client IP and the
  // https scheme arrive via X-Forwarded-*; without this secure cookies are
  // dropped and rate limiting keys on the proxy IP.
  if (process.env.NODE_ENV === 'production' || process.env.TRUST_PROXY === 'true') {
    app.set('trust proxy', Number(process.env.TRUST_PROXY_HOPS) || 1);
  }

  // Global kill-switch for rate limiters — used by tests to avoid cross-file
  // singleton exhaustion. All limiters check this module flag (rateLimit.js).
  const rateLimitModule = await import('./middleware/rateLimit.js');
  rateLimitModule.setRateLimitsEnabled(!disableRateLimits);

  // Security
  app.use(helmet());
  app.use(cors);

  // Body parsing
  app.use(express.json({ limit: '2mb' }));
  app.use(cookieParser());

  // Session (shared config lives in config/session.js — single source of truth)
  app.use(
    session(
      createSessionMiddleware(
        mongoUri || process.env.MONGO_URI || 'mongodb://127.0.0.1/story-builder',
      ),
    ),
  );

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

  const storyRoutes = await import('./routes/story.routes.js');
  app.use('/api/stories', storyRoutes.default);
  // Public share read — no auth/CSRF (SPEC §3.2 Share).
  app.use('/s', storyRoutes.shareRouter);

  // Public discovery — no auth/CSRF: browse/search published stories.
  const exploreRoutes = await import('./routes/explore.routes.js');
  app.use('/api/explore', exploreRoutes.default);

  // Branching nodes (SPEC §3.2 Branching) — serves /api/stories/:id/nodes and
  // /api/nodes/... from one router; mounted before story's export routes so the
  // `nodes` path segment never collides.
  const nodeRoutes = await import('./routes/node.routes.js');
  app.use('/api', nodeRoutes.default);

  const aiRoutes = await import('./routes/ai.routes.js');
  app.use('/api/ai', aiRoutes.default);

  // Export downloads (PDF/EPUB) live under the story resource. Mounted after
  // storyRoutes; story's `/:id` never matches the extra path segments.
  const exportRoutes = await import('./routes/export.routes.js');
  app.use('/api/stories', exportRoutes.default);

  // Central error handler
  const errorHandler = await import('./middleware/errorHandler.js');
  app.use(errorHandler.default);

  return app;
}
