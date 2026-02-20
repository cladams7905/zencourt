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
});
