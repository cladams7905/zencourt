import "tsconfig-paths/register";
import express, { Express, Request, Response } from "express";
import pinoHttp, { Options as PinoHttpOptions } from "pino-http";
import InitializeEnv from "./config/env";
import logger from "./config/logger";
import videoRoutes from "./routes/video";
import healthRoutes from "./routes/health";
import storageRoutes from "./routes/storage";
import webhookRoutes from "./routes/webhooks";
import { errorHandler } from "./middleware/errorHandler";

/**
 * Main Express server for video processing
 * Handles FFmpeg operations for Zencourt video generation
 */
InitializeEnv();
const app: Express = express();

// Middleware
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true }));

// Request logging with Pino
const pinoOptions: PinoHttpOptions = {
  logger: logger,
  autoLogging: {
    ignore(req) {
      return req.url === "/health";
    }
  },
  customLogLevel: (_req, res, err) => {
    if (res.statusCode >= 500 || err) return "error";
    if (res.statusCode >= 400) return "warn";
    return "info";
  },
  customSuccessMessage: (req, res) =>
    `${req.method} ${req.url} - ${res.statusCode}`,
  customErrorMessage: (req, res, err) =>
    `${req.method} ${req.url} - ${res.statusCode} - ${err.message}`
};

app.use(pinoHttp(pinoOptions));

// Routes
app.get("/", (_req: Request, res: Response) => {
  res.json({
    service: "Zencourt Video Processor",
    version: "1.0.0",
    status: "running",
    timestamp: new Date().toISOString()
  });
});

// Video processing routes
app.use("/video", videoRoutes);

// Storage routes (upload/delete)
app.use("/storage", storageRoutes);

// Webhook routes (fal.ai callbacks)
app.use("/webhooks", webhookRoutes);

// Health check endpoint
app.use("/health", healthRoutes);

// 404 handler
app.use((req: Request, res: Response) => {
  res.status(404).json({
    success: false,
    error: "Not Found",
    message: `Cannot ${req.method} ${req.url}`
  });
});

// Global error handler
app.use(errorHandler);

// Graceful shutdown handler
let server: ReturnType<typeof app.listen> | null = null;
let isShuttingDown = false;

async function gracefulShutdown(signal: string): Promise<void> {
  if (isShuttingDown) {
    logger.warn("Shutdown already in progress, ignoring signal");
    return;
  }

  isShuttingDown = true;
  logger.info(
    { signal },
    "Received shutdown signal - starting graceful shutdown"
  );

  // Force shutdown after 30 seconds
  const forceShutdownTimer = setTimeout(() => {
    logger.error("Graceful shutdown timeout - forcing exit");
    process.exit(1);
  }, 30000);

  try {
    // Stop accepting new HTTP connections
    if (server) {
      logger.info("Stopping HTTP server from accepting new connections...");
      await new Promise<void>((resolve) => {
        server!.close(() => {
          logger.info("HTTP server stopped accepting new connections");
          resolve();
        });
      });
    }

    // Exit successfully
    clearTimeout(forceShutdownTimer);
    logger.info("Graceful shutdown completed successfully");
    process.exit(0);
  } catch (error) {
    clearTimeout(forceShutdownTimer);
    logger.error(
      {
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined
      },
      "Error during graceful shutdown"
    );
    process.exit(1);
  }
}

// Listen for termination signals
process.on("SIGTERM", () => gracefulShutdown("SIGTERM"));
process.on("SIGINT", () => gracefulShutdown("SIGINT"));

// Start server
server = app.listen(process.env.PORT, () => {
  logger.info(
    {
      port: process.env.PORT,
      nodeEnv: process.env.NODE_ENV,
      storageRegion: process.env.B2_REGION
    },
    `Video processing server started on port ${process.env.PORT}`
  );
});

export default app;
