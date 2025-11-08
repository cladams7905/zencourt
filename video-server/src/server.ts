import express, { Express, Request, Response, NextFunction } from 'express';
import pinoHttp from 'pino-http';
import { validateEnv, env } from './config/env';
import logger from './config/logger';

/**
 * Main Express server for video processing
 * Handles FFmpeg operations for ZenCourt video generation
 */

// Validate environment variables before starting
validateEnv();

const app: Express = express();

// Middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Request logging with Pino
app.use(
  pinoHttp({
    logger,
    customLogLevel: (_req, res, err) => {
      if (res.statusCode >= 500 || err) return 'error';
      if (res.statusCode >= 400) return 'warn';
      return 'info';
    },
    customSuccessMessage: (req, res) => {
      return `${req.method} ${req.url} - ${res.statusCode}`;
    },
    customErrorMessage: (req, res, err) => {
      return `${req.method} ${req.url} - ${res.statusCode} - ${err.message}`;
    },
  })
);

// Routes will be added here
app.get('/', (_req: Request, res: Response) => {
  res.json({
    service: 'ZenCourt Video Processor',
    version: '1.0.0',
    status: 'running',
    timestamp: new Date().toISOString(),
  });
});

// Health check endpoint (placeholder - will be implemented in task 10)
app.get('/health', (_req: Request, res: Response) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    checks: {
      ffmpeg: true,
      s3: true,
      redis: true,
    },
  });
});

// 404 handler
app.use((req: Request, res: Response) => {
  res.status(404).json({
    success: false,
    error: 'Not Found',
    message: `Cannot ${req.method} ${req.url}`,
  });
});

// Global error handler
app.use((err: Error, req: Request, res: Response, _next: NextFunction) => {
  logger.error({ err, req: { method: req.method, url: req.url } }, 'Unhandled error');

  res.status(500).json({
    success: false,
    error: 'Internal Server Error',
    message: env.nodeEnv === 'development' ? err.message : 'An unexpected error occurred',
  });
});

// Graceful shutdown handler
let server: ReturnType<typeof app.listen> | null = null;

function gracefulShutdown(signal: string): void {
  logger.info({ signal }, 'Received shutdown signal');

  if (server) {
    logger.info('Closing HTTP server...');
    server.close(() => {
      logger.info('HTTP server closed');
      process.exit(0);
    });

    // Force shutdown after 30 seconds
    setTimeout(() => {
      logger.error('Forced shutdown after timeout');
      process.exit(1);
    }, 30000);
  } else {
    process.exit(0);
  }
}

// Listen for termination signals
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

// Start server
server = app.listen(env.port, () => {
  logger.info(
    {
      port: env.port,
      nodeEnv: env.nodeEnv,
      awsRegion: env.awsRegion,
    },
    `🚀 Video processing server started on port ${env.port}`
  );
});

export default app;
