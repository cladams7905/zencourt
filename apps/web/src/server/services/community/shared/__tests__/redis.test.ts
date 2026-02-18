const mockRedisCtor = jest.fn();

jest.mock("@upstash/redis", () => ({
  Redis: function Redis(this: unknown, ...args: unknown[]) {
    mockRedisCtor(...args);
  }
}));

import { createRedisClientGetter } from "@web/src/server/services/community/shared/redis";

describe("createRedisClientGetter", () => {
  const logger = { info: jest.fn(), warn: jest.fn() };

  beforeEach(() => {
    logger.info.mockReset();
    logger.warn.mockReset();
    mockRedisCtor.mockReset();
    delete process.env.KV_REST_API_URL;
    delete process.env.KV_REST_API_TOKEN;
  });

  it("returns null and warns when env missing", () => {
    const getClient = createRedisClientGetter({
      logger,
      missingEnvMessage: "missing",
      initializedMessage: "init"
    });

    expect(getClient()).toBeNull();
    expect(getClient()).toBeNull();
    expect(logger.warn).toHaveBeenCalled();
    expect(mockRedisCtor).not.toHaveBeenCalled();
  });

  it("initializes redis once when env present", () => {
    process.env.KV_REST_API_URL = "https://example.com";
    process.env.KV_REST_API_TOKEN = "token";

    const getClient = createRedisClientGetter({
      logger,
      missingEnvMessage: "missing",
      initializedMessage: "init"
    });

    const first = getClient();
    const second = getClient();

    expect(first).toBeTruthy();
    expect(second).toBe(first);
    expect(mockRedisCtor).toHaveBeenCalledTimes(1);
    expect(logger.info).toHaveBeenCalled();
  });
});
