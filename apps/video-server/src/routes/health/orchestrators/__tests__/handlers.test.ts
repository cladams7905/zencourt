import {
  buildHealthResponse,
  resolveStorageHealth
} from "@/routes/health/orchestrators/handlers";

describe("health orchestrators", () => {
  it("returns cached healthy value", async () => {
    const result = await resolveStorageHealth({
      cache: { healthy: true, timestamp: 1000 },
      cacheMs: 5000,
      now: 2000,
      checkBucketAccess: jest.fn()
    });
    expect(result.healthy).toBe(true);
  });

  it("falls back to false on check failure", async () => {
    const result = await resolveStorageHealth({
      cache: null,
      cacheMs: 0,
      now: 2000,
      checkBucketAccess: jest.fn().mockRejectedValue(new Error("boom"))
    });
    expect(result.healthy).toBe(false);
  });

  it("builds unhealthy response", () => {
    const response = buildHealthResponse(false);
    expect(response.statusCode).toBe(503);
    expect(response.body.status).toBe("unhealthy");
  });

  it("builds healthy response", () => {
    const response = buildHealthResponse(true);
    expect(response.statusCode).toBe(200);
    expect(response.body.status).toBe("healthy");
    expect(response.body.checks.storage).toBe(true);
  });

  it("re-checks when cache is expired", async () => {
    const checkBucketAccess = jest.fn().mockResolvedValue(true);
    const result = await resolveStorageHealth({
      cache: { healthy: false, timestamp: 1000 },
      cacheMs: 500,
      now: 2000, // 1000ms elapsed > 500ms ttl
      checkBucketAccess
    });
    expect(checkBucketAccess).toHaveBeenCalledTimes(1);
    expect(result.healthy).toBe(true);
  });

  it("returns result from checkBucketAccess on cache miss", async () => {
    const result = await resolveStorageHealth({
      cache: null,
      cacheMs: 5000,
      now: 1000,
      checkBucketAccess: jest.fn().mockResolvedValue(true)
    });
    expect(result.healthy).toBe(true);
    expect(result.cache.healthy).toBe(true);
  });
});
