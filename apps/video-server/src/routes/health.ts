/**
 * Health check route
 * Verifies that all critical services are operational
 */

import { Router, Request, Response } from "express";
import logger from "@/config/logger";
import { storageService } from "@/services/storageService";
import { HealthCheckResponse } from "@shared/types/api";

const router = Router();

type StorageHealthCache = {
  healthy: boolean;
  timestamp: number;
};

let storageHealthCache: StorageHealthCache | null = null;

/**
 * Check if storage is accessible
 */
async function checkStorage(): Promise<boolean> {
  const cacheMs = Number(process.env.STORAGE_HEALTH_CACHE_MS) || 0;
  if (
    cacheMs > 0 &&
    storageHealthCache &&
    Date.now() - storageHealthCache.timestamp < cacheMs
  ) {
    logger.debug(
      {
        healthy: storageHealthCache.healthy,
        ageMs: Date.now() - storageHealthCache.timestamp
      },
      "Using cached storage health result"
    );
    return storageHealthCache.healthy;
  }

  try {
    const healthy = await storageService.checkBucketAccess();
    storageHealthCache = {
      healthy,
      timestamp: Date.now()
    };
    return healthy;
  } catch (error) {
    logger.warn(
      {
        error: error instanceof Error ? error.message : String(error)
      },
      "Storage health check failed"
    );
    storageHealthCache = {
      healthy: false,
      timestamp: Date.now()
    };
    return false;
  }
}

/**
 * GET /health
 * Health check endpoint that verifies all critical services
 */
router.get("/", async (_req: Request, res: Response) => {
  try {
    const storageHealthy = await checkStorage();

    // Determine overall health status
    const allHealthy = storageHealthy;
    const status = allHealthy ? "healthy" : "unhealthy";

    const response: HealthCheckResponse = {
      status,
      timestamp: new Date().toISOString(),
      checks: {
        storage: storageHealthy
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
        storage: false
      }
    };

    res.status(503).json(response);
  }
});

export default router;
