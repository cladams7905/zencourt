import express, { Express, Request, Response } from 'express';
import pinoHttp from 'pino-http';
import { validateEnv, env } from './config/env';
import logger from './config/logger';
import videoRoutes from './routes/video';
import healthRoutes from './routes/health';
import { errorHandler } from './middleware/errorHandler';
import { closeQueue } from './queues/videoQueue';

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

// Routes
app.get('/', (_req: Request, res: Response) => {
  res.json({
    service: 'ZenCourt Video Processor',
    version: '1.0.0',
    status: 'running',
    timestamp: new Date().toISOString(),
  });
});

// Video processing routes
app.use('/video', videoRoutes);

// Health check endpoint
app.use('/health', healthRoutes);

// 404 handler
app.use((req: Request, res: Response) => {
  res.status(404).json({
    success: false,
    error: 'Not Found',
    message: `Cannot ${req.method} ${req.url}`,
  });
});

// Global error handler
app.use(errorHandler);

// Graceful shutdown handler
let server: ReturnType<typeof app.listen> | null = null;
let isShuttingDown = false;

async function gracefulShutdown(signal: string): Promise<void> {
  if (isShuttingDown) {
    logger.warn('Shutdown already in progress, ignoring signal');
    return;
  }

  isShuttingDown = true;
  logger.info({ signal }, 'Received shutdown signal - starting graceful shutdown');

  // Force shutdown after 30 seconds (requirement 3.5)
  const forceShutdownTimer = setTimeout(() => {
    logger.error('Graceful shutdown timeout - forcing exit');
    process.exit(1);
  }, 30000);

  try {
    // Step 1: Stop accepting new HTTP connections
    if (server) {
      logger.info('Stopping HTTP server from accepting new connections...');
      await new Promise<void>((resolve) => {
        server!.close(() => {
          logger.info('HTTP server stopped accepting new connections');
          resolve();
        });
      });
    }

    // Step 2: Wait for active jobs to complete and close queue
    logger.info('Waiting for active jobs to complete and closing queue...');
    await closeQueue();
    logger.info('Queue closed successfully');

    // Step 3: Exit successfully
    clearTimeout(forceShutdownTimer);
    logger.info('Graceful shutdown completed successfully');
    process.exit(0);
  } catch (error) {
    clearTimeout(forceShutdownTimer);
    logger.error(
      {
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
      },
      'Error during graceful shutdown'
    );
    process.exit(1);
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
