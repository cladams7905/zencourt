/**
 * Health check route
 * Verifies that all critical services are operational
 */

import { Router, Request, Response } from "express";
import { exec } from "child_process";
import { promisify } from "util";
import { logger } from "@/config/logger";
import { s3Service } from "@/services/s3Service";
import { checkRedisHealth, getQueueStats } from "@/queues/videoQueue";
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
 * Check if Redis is accessible
 */
async function checkRedis(): Promise<boolean> {
  try {
    return await checkRedisHealth();
  } catch (error) {
    logger.warn(
      {
        error: error instanceof Error ? error.message : String(error)
      },
      "Redis health check failed"
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
    const [ffmpegHealthy, s3Healthy, redisHealthy, queueStats] =
      await Promise.all([
        checkFFmpeg(),
        checkS3(),
        checkRedis(),
        getQueueStats().catch(() => ({
          waiting: 0,
          active: 0,
          completed: 0,
          failed: 0,
          delayed: 0,
          paused: 0
        }))
      ]);

    // Determine overall health status
    const allHealthy = ffmpegHealthy && s3Healthy && redisHealthy;
    const status = allHealthy ? "healthy" : "unhealthy";

    const response: HealthCheckResponse = {
      status,
      timestamp: new Date().toISOString(),
      checks: {
        ffmpeg: ffmpegHealthy,
        s3: s3Healthy,
        redis: redisHealthy
      },
      queueStats: {
        waiting: queueStats.waiting,
        active: queueStats.active,
        completed: queueStats.completed,
        failed: queueStats.failed
      }
    };

    if (allHealthy) {
      logger.info(
        {
          checks: response.checks,
          queueStats: response.queueStats
        },
        "Health check passed"
      );
    } else {
      logger.warn(
        {
          status,
          checks: response.checks,
          queueStats: response.queueStats
        },
        "Health check detected issues"
      );
    }

    // Return 503 if any service is unhealthy (requirement 12.3)
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
        s3: false,
        redis: false
      },
      queueStats: {
        waiting: 0,
        active: 0,
        completed: 0,
        failed: 0
      }
    };

    res.status(503).json(response);
  }
});

export default router;
