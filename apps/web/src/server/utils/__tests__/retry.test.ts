import {
  isRetryableHttpStatus,
  getExponentialBackoffDelayMs,
  sleep
} from "@web/src/server/utils/retry";

describe("retry utils", () => {
  it("identifies retryable statuses", () => {
    expect(isRetryableHttpStatus(429)).toBe(true);
    expect(isRetryableHttpStatus(500)).toBe(true);
    expect(isRetryableHttpStatus(503)).toBe(true);
    expect(isRetryableHttpStatus(400)).toBe(false);
  });

  it("computes capped exponential backoff", () => {
    expect(getExponentialBackoffDelayMs(1, 100, 2000)).toBe(100);
    expect(getExponentialBackoffDelayMs(2, 100, 2000)).toBe(200);
    expect(getExponentialBackoffDelayMs(6, 100, 2000)).toBe(2000);
  });

  it("sleeps for the requested duration", async () => {
    jest.useFakeTimers();
    const done = sleep(25);
    jest.advanceTimersByTime(25);
    await expect(done).resolves.toBeUndefined();
    jest.useRealTimers();
  });
});
