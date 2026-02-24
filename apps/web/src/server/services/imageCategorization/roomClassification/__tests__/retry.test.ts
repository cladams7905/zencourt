import { executeWithRetry } from "../retry";

function createLogger() {
  return {
    debug: jest.fn(),
    warn: jest.fn(),
    error: jest.fn()
  };
}

describe("roomClassification/retry", () => {
  it("returns operation result on first successful attempt", async () => {
    const logger = createLogger();
    const sleep = jest.fn().mockResolvedValue(undefined);

    await expect(
      executeWithRetry({
        operation: async () => "ok",
        options: {
          timeout: 100,
          maxRetries: 2,
          timeoutMessage: "timed out",
          failureContext: "classify room"
        },
        logger,
        sleep
      })
    ).resolves.toBe("ok");

    expect(logger.debug).toHaveBeenCalledTimes(1);
    expect(sleep).not.toHaveBeenCalled();
  });

  it("maps rate limit failures to RATE_LIMIT error", async () => {
    const logger = createLogger();
    const sleep = jest.fn().mockResolvedValue(undefined);

    await expect(
      executeWithRetry({
        operation: async () => {
          throw new Error("rate_limit_exceeded");
        },
        options: {
          timeout: 100,
          maxRetries: 2,
          timeoutMessage: "timed out",
          failureContext: "classify room"
        },
        logger,
        sleep
      })
    ).rejects.toMatchObject({ code: "RATE_LIMIT" });

    expect(logger.warn).toHaveBeenCalled();
    expect(sleep).not.toHaveBeenCalled();
  });

  it("retries and succeeds on a later attempt", async () => {
    const logger = createLogger();
    const sleep = jest.fn().mockResolvedValue(undefined);
    const operation = jest
      .fn()
      .mockRejectedValueOnce(new Error("temporary failure"))
      .mockResolvedValueOnce("ok");

    await expect(
      executeWithRetry({
        operation,
        options: {
          timeout: 100,
          maxRetries: 2,
          timeoutMessage: "timed out",
          failureContext: "classify room"
        },
        logger,
        sleep
      })
    ).resolves.toBe("ok");

    expect(operation).toHaveBeenCalledTimes(2);
    expect(sleep).toHaveBeenCalledTimes(1);
  });

  it("throws API_ERROR when retries are exhausted", async () => {
    const logger = createLogger();
    const sleep = jest.fn().mockResolvedValue(undefined);

    await expect(
      executeWithRetry({
        operation: async () => {
          throw new Error("downstream unavailable");
        },
        options: {
          timeout: 100,
          maxRetries: 1,
          timeoutMessage: "timed out",
          failureContext: "classify room"
        },
        logger,
        sleep
      })
    ).rejects.toMatchObject({ code: "API_ERROR" });

    expect(logger.error).toHaveBeenCalledTimes(1);
  });
});
