import type { HealthCheckResponse } from "@shared/types/api";
import type { StorageHealthCache } from "@/routes/health/domain/healthCache";
import { getCachedHealth } from "@/routes/health/domain/healthCache";

export async function resolveStorageHealth(args: {
  cache: StorageHealthCache | null;
  cacheMs: number;
  now: number;
  checkBucketAccess: () => Promise<boolean>;
}): Promise<{ healthy: boolean; cache: StorageHealthCache }> {
  const cached = getCachedHealth(args.cache, args.cacheMs, args.now);
  if (cached !== null) {
    return {
      healthy: cached,
      cache: args.cache as StorageHealthCache
    };
  }

  try {
    const healthy = await args.checkBucketAccess();
    return {
      healthy,
      cache: { healthy, timestamp: args.now }
    };
  } catch {
    return {
      healthy: false,
      cache: { healthy: false, timestamp: args.now }
    };
  }
}

export function buildHealthResponse(storageHealthy: boolean): {
  statusCode: 200 | 503;
  body: HealthCheckResponse;
} {
  const allHealthy = storageHealthy;
  const status = allHealthy ? "healthy" : "unhealthy";

  return {
    statusCode: allHealthy ? 200 : 503,
    body: {
      status,
      timestamp: new Date().toISOString(),
      checks: {
        storage: storageHealthy
      }
    }
  };
}
