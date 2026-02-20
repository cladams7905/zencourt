import { TTLCache } from "@/services/videoGeneration/domain/cache";

describe("TTLCache", () => {
  beforeEach(() => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date("2026-01-01T00:00:00.000Z"));
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it("returns undefined for expired entries and prunes on access", () => {
    const cache = new TTLCache<string, string>({ ttlMs: 1000 });
    cache.set("k1", "v1");

    jest.advanceTimersByTime(1001);

    expect(cache.get("k1")).toBeUndefined();
    expect(cache.has("k1")).toBe(false);
    expect(cache.size).toBe(0);
  });

  it("evicts oldest key when max size is reached", () => {
    const cache = new TTLCache<string, string>({ maxSize: 2, ttlMs: 10_000 });

    cache.set("a", "1");
    cache.set("b", "2");
    cache.set("c", "3");

    expect(cache.get("a")).toBeUndefined();
    expect(cache.get("b")).toBe("2");
    expect(cache.get("c")).toBe("3");
  });

  it("prune removes only expired entries", () => {
    const cache = new TTLCache<string, string>({ ttlMs: 2000 });

    cache.set("a", "1");
    cache.set("b", "2", 5000);

    jest.advanceTimersByTime(2500);

    expect(cache.prune()).toBe(1);
    expect(cache.get("a")).toBeUndefined();
    expect(cache.get("b")).toBe("2");
  });

  it("delete removes a specific entry", () => {
    const cache = new TTLCache<string, string>({ ttlMs: 10_000 });
    cache.set("a", "1");
    cache.set("b", "2");

    expect(cache.delete("a")).toBe(true);
    expect(cache.get("a")).toBeUndefined();
    expect(cache.get("b")).toBe("2");
    expect(cache.delete("nonexistent")).toBe(false);
  });

  it("clear empties the cache", () => {
    const cache = new TTLCache<string, string>({ ttlMs: 10_000 });
    cache.set("a", "1");
    cache.set("b", "2");

    cache.clear();

    expect(cache.size).toBe(0);
    expect(cache.get("a")).toBeUndefined();
  });

  it("startAutoPrune fires prune on interval", () => {
    const cache = new TTLCache<string, string>({ ttlMs: 400 });
    cache.set("a", "1");

    const stop = cache.startAutoPrune(500);

    jest.advanceTimersByTime(499);
    expect(cache.size).toBe(1); // not yet pruned — interval hasn't fired

    jest.advanceTimersByTime(2); // total 501ms — interval fires, entry expired at 400ms
    expect(cache.size).toBe(0);

    stop();
  });
});
