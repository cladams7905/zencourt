/**
 * Health check route
 * Verifies that all critical services are operational
 */

import { Router, Request, Response } from "express";
import { exec } from "child_process";
import { promisify } from "util";
import { logger } from "@/config/logger";
import { s3Service } from "@/services/s3Service";
import { HealthCheckResponse } from "@shared/types/api";

const execAsync = promisify(exec);
const router = Router();

/**
 * Check if FFmpeg is available and working
 */
async function checkFFmpeg(): Promise<boolean> {
  try {
    const { stdout } = await execAsync("ffmpeg -version");
    return stdout.includes("ffmpeg version");
  } catch (error) {
    logger.warn(
      {
        error: error instanceof Error ? error.message : String(error)
      },
      "FFmpeg health check failed"
    );
    return false;
  }
}

/**
 * Check if S3 is accessible
 */
async function checkS3(): Promise<boolean> {
  try {
    return await s3Service.checkBucketAccess();
  } catch (error) {
    logger.warn(
      {
        error: error instanceof Error ? error.message : String(error)
      },
      "S3 health check failed"
    );
    return false;
  }
}


/**
 * GET /health
 * Health check endpoint that verifies all critical services
 */
router.get("/", async (_req: Request, res: Response) => {
  try {
    // Run all health checks in parallel
    const [ffmpegHealthy, s3Healthy] = await Promise.all([
      checkFFmpeg(),
      checkS3()
    ]);

    // Determine overall health status
    const allHealthy = ffmpegHealthy && s3Healthy;
    const status = allHealthy ? "healthy" : "unhealthy";

    const response: HealthCheckResponse = {
      status,
      timestamp: new Date().toISOString(),
      checks: {
        ffmpeg: ffmpegHealthy,
        s3: s3Healthy
      }
    };

    if (allHealthy) {
      logger.info({ checks: response.checks }, "Health check passed");
    } else {
      logger.warn(
        { status, checks: response.checks },
        "Health check detected issues"
      );
    }

    // Return 503 if any service is unhealthy
    const statusCode = allHealthy ? 200 : 503;
    res.status(statusCode).json(response);
  } catch (error) {
    logger.error(
      {
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined
      },
      "Health check endpoint error"
    );

    // Return 503 on error
    const response: HealthCheckResponse = {
      status: "unhealthy",
      timestamp: new Date().toISOString(),
      checks: {
        ffmpeg: false,
        s3: false
      }
    };

    res.status(503).json(response);
  }
});

export default router;
