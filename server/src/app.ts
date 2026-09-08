import path from 'path';
import fs from 'fs';
import express, { Express } from 'express';
import helmet from 'helmet';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import { env } from './config/env';
import { apiRouter } from './routes';
import { errorHandler } from './middleware/errorHandler';
import { apiLimiter } from './middleware/rateLimiters';

export function createApp(): Express {
  const app = express();

  // Security headers
  app.use(
    helmet({
      contentSecurityPolicy: false, // Allows flexible canvas & R3F assets
      crossOriginEmbedderPolicy: false,
    })
  );

  // CORS: In production unified deployment, same-origin is true, or allow CLIENT_URL
  app.use(
    cors({
      origin: env.NODE_ENV === 'production' ? true : env.CLIENT_URL,
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization'],
    })
  );

  // Body parsers
  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true, limit: '10mb' }));
  app.use(cookieParser());

  // Health check endpoints (for Render / UptimeRobot / cron-job.org)
  const healthResponse = (_req: express.Request, res: express.Response) => {
    res.status(200).json({
      status: 'ok',
      service: 'UsTwo',
      uptime: process.uptime(),
      timestamp: new Date().toISOString(),
    });
  };
  app.get('/health', healthResponse);
  app.get('/api/health', healthResponse);

  // Rate Limiter for API
  app.use('/api', apiLimiter);

  // API Routes
  app.use('/api', apiRouter);

  // Serve static client assets if client/dist exists (Unified Production Deployment)
  const clientDistPath = path.resolve(__dirname, '../../client/dist');
  if (fs.existsSync(clientDistPath)) {
    app.use(express.static(clientDistPath));

    // Client SPA fallback for non-API routes
    app.get('*', (req, res, next) => {
      if (req.path.startsWith('/api') || req.path.startsWith('/socket.io')) {
        return next();
      }
      res.sendFile(path.join(clientDistPath, 'index.html'));
    });
  }

  // 404 handler for unmatched API routes
  app.use((_req, res) => {
    res.status(404).json({
      success: false,
      error: {
        code: 'NOT_FOUND',
        message: 'The requested resource was not found',
      },
    });
  });

  // Centralized error handler
  app.use(errorHandler);

  return app;
}
