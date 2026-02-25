/**
 * @jest-environment node
 */

const mockWarn = jest.fn();
const mockInfo = jest.fn();
const mockDebug = jest.fn();

jest.mock("@web/src/lib/core/logging/logger", () => ({
  logger: {},
  createChildLogger: () => ({
    warn: (...args: unknown[]) => ((mockWarn as (...a: unknown[]) => unknown)(...args)),
    info: (...args: unknown[]) => ((mockInfo as (...a: unknown[]) => unknown)(...args)),
    debug: (...args: unknown[]) => ((mockDebug as (...a: unknown[]) => unknown)(...args))
  })
}));

const mockRedisConstructor = jest.fn();
jest.mock("@upstash/redis", () => ({
  Redis: class {
    constructor(...args: unknown[]) {
      mockRedisConstructor(...args);
    }
  }
}));

describe("getSharedRedisClient", () => {
  const originalUrl = process.env.KV_REST_API_URL;
  const originalToken = process.env.KV_REST_API_TOKEN;

  beforeEach(() => {
    jest.resetModules();
    mockWarn.mockReset();
    mockInfo.mockReset();
    mockDebug.mockReset();
    mockRedisConstructor.mockReset();
  });

  afterAll(() => {
    process.env.KV_REST_API_URL = originalUrl;
    process.env.KV_REST_API_TOKEN = originalToken;
  });

  async function importFresh() {
    const mod = await import("../redis");
    return mod.getSharedRedisClient;
  }

  it("returns null when KV_REST_API_URL is missing", async () => {
    delete process.env.KV_REST_API_URL;
    process.env.KV_REST_API_TOKEN = "token";
    const getSharedRedisClient = await importFresh();
    const result = getSharedRedisClient();
    expect(result).toBeNull();
    expect(mockWarn).toHaveBeenCalled();
  });

  it("returns null when KV_REST_API_TOKEN is missing", async () => {
    process.env.KV_REST_API_URL = "https://redis.example.com";
    delete process.env.KV_REST_API_TOKEN;
    const getSharedRedisClient = await importFresh();
    const result = getSharedRedisClient();
    expect(result).toBeNull();
    expect(mockWarn).toHaveBeenCalled();
  });

  it("returns a Redis instance when both env vars are set", async () => {
    process.env.KV_REST_API_URL = "https://redis.example.com";
    process.env.KV_REST_API_TOKEN = "token";
    const getSharedRedisClient = await importFresh();
    const result = getSharedRedisClient();
    expect(result).not.toBeNull();
    expect(mockRedisConstructor).toHaveBeenCalledTimes(1);
    expect(mockDebug).toHaveBeenCalled();
  });

  it("returns the same cached instance on repeat calls", async () => {
    process.env.KV_REST_API_URL = "https://redis.example.com";
    process.env.KV_REST_API_TOKEN = "token";
    const getSharedRedisClient = await importFresh();
    const first = getSharedRedisClient();
    const second = getSharedRedisClient();
    expect(first).toBe(second);
    expect(mockRedisConstructor).toHaveBeenCalledTimes(1);
  });
});
