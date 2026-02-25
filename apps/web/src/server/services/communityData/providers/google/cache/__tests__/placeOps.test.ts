import { createPlaceCacheOps } from "../placeOps";

function makeDeps(overrides?: {
  redis?: { get: jest.Mock; set: jest.Mock } | null;
  now?: () => Date;
}) {
  const redis = overrides?.redis ?? {
    get: jest.fn(),
    set: jest.fn()
  };
  const warn = jest.fn();
  return {
    redis,
    warn,
    ops: createPlaceCacheOps({
      getRedisClient: () => redis,
      logger: { warn },
      now: overrides?.now ?? (() => new Date("2025-01-01T00:00:00.000Z"))
    })
  };
}

describe("google place cache ops", () => {
  it("returns null reads when redis is unavailable", async () => {
    const warn = jest.fn();
    const ops = createPlaceCacheOps({
      getRedisClient: () => null,
      logger: { warn },
      now: () => new Date()
    });

    await expect(ops.getCachedPlaceDetails("p1")).resolves.toBeNull();
    await expect(
      ops.getCachedAudienceDelta("78701", "families")
    ).resolves.toBeNull();
    await expect(ops.getCachedPlacePool("78701", "dining")).resolves.toBeNull();
  });

  it("gets and sets place details", async () => {
    const { redis, ops } = makeDeps();
    redis.get.mockResolvedValueOnce({ placeId: "p1" });

    await expect(ops.getCachedPlaceDetails("p1")).resolves.toEqual({ placeId: "p1" });

    await ops.setCachedPlaceDetails("p1", { placeId: "p1" } as never);
    expect(redis.set).toHaveBeenCalled();
  });

  it("logs and suppresses redis failures", async () => {
    const { redis, warn, ops } = makeDeps();
    redis.get.mockRejectedValueOnce(new Error("boom"));

    await expect(ops.getCachedPlaceDetails("p1")).resolves.toBeNull();
    expect(warn).toHaveBeenCalledWith(
      expect.objectContaining({ placeId: "p1", error: "boom" }),
      "Failed to read place details from cache"
    );
  });

  it("writes place pool payload with fetchedAt/queryCount", async () => {
    const { redis, ops } = makeDeps();

    await ops.setCachedPlacePool("78701", "dining", [
      { placeId: "a" },
      { placeId: "b" }
    ] as never);

    expect(redis.set).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({
        items: [{ placeId: "a" }, { placeId: "b" }],
        fetchedAt: "2025-01-01T00:00:00.000Z",
        queryCount: 2
      }),
      expect.any(Object)
    );
  });
});
