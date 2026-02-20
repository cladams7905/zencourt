import { Router, Request, Response } from "express";
import logger from "@/config/logger";
import { storageService } from "@/services/storageService";
import type { StorageHealthCache } from "@/routes/health/domain/healthCache";
import {
  buildHealthResponse,
  resolveStorageHealth
} from "@/routes/health/orchestrators/handlers";

const router = Router();

let storageHealthCache: StorageHealthCache | null = null;

router.get("/", async (_req: Request, res: Response) => {
  try {
    const cacheMs = Number(process.env.STORAGE_HEALTH_CACHE_MS) || 0;
    const now = Date.now();
    const { healthy, cache } = await resolveStorageHealth({
      cache: storageHealthCache,
      cacheMs,
      now,
      checkBucketAccess: () => storageService.checkBucketAccess()
    });
    storageHealthCache = cache;

    const response = buildHealthResponse(healthy);
    if (healthy) {
      logger.info({ checks: response.body.checks }, "Health check passed");
    } else {
      logger.warn(
        { status: response.body.status, checks: response.body.checks },
        "Health check detected issues"
      );
    }
    res.status(response.statusCode).json(response.body);
  } catch (error) {
    logger.error(
      {
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined
      },
      "Health check endpoint error"
    );
    const fallback = buildHealthResponse(false);
    res.status(503).json(fallback.body);
  }
});

export default router;
