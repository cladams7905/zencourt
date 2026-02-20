import { getCachedHealth } from "@/routes/health/domain/healthCache";

describe("health cache", () => {
  it("returns cached value when still fresh", () => {
    const result = getCachedHealth(
      { healthy: true, timestamp: 1000 },
      1000,
      1500
    );
    expect(result).toBe(true);
  });

  it("returns null when stale", () => {
    const result = getCachedHealth(
      { healthy: true, timestamp: 1000 },
      1000,
      3001
    );
    expect(result).toBeNull();
  });
});
