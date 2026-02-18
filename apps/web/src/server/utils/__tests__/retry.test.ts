import {
  isRetryableHttpStatus,
  getExponentialBackoffDelayMs
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
});
