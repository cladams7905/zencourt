/** @jest-environment node */

const mockBackoff = jest.fn();
const mockIsRetryable = jest.fn();
const mockSleep = jest.fn();

jest.mock("@web/src/server/utils/retry", () => ({
  getExponentialBackoffDelayMs: (...args: unknown[]) =>
    (mockBackoff as (...a: unknown[]) => unknown)(...args),
  isRetryableHttpStatus: (...args: unknown[]) =>
    (mockIsRetryable as (...a: unknown[]) => unknown)(...args),
  sleep: (...args: unknown[]) =>
    (mockSleep as (...a: unknown[]) => unknown)(...args)
}));

jest.mock("@web/src/lib/core/logging/logger", () => ({
  logger: {},
  createChildLogger: () => ({
    warn: jest.fn(),
    error: jest.fn(),
    info: jest.fn()
  })
}));

import { requestPerplexity } from "@web/src/server/services/_integrations/perplexity/client";
import { PERPLEXITY_API_URL } from "@web/src/server/services/_integrations/perplexity/constants";

describe("perplexity client", () => {
  const originalFetch = global.fetch;
  const originalApiKey = process.env.PERPLEXITY_API_KEY;

  beforeEach(() => {
    mockBackoff.mockReset();
    mockIsRetryable.mockReset();
    mockSleep.mockReset();
    mockBackoff.mockReturnValue(0);
    mockIsRetryable.mockReturnValue(true);
    mockSleep.mockResolvedValue(undefined);
    (global as { fetch?: typeof fetch }).fetch = jest.fn();
  });

  afterEach(() => {
    process.env.PERPLEXITY_API_KEY = originalApiKey;
  });

  afterAll(() => {
    global.fetch = originalFetch;
  });

  it("returns null when PERPLEXITY_API_KEY is not set", async () => {
    delete process.env.PERPLEXITY_API_KEY;

    const result = await requestPerplexity({
      messages: [{ role: "user", content: "hello" }]
    });

    expect(result).toBeNull();
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it("POSTs to Perplexity API with correct headers and default model", async () => {
    process.env.PERPLEXITY_API_KEY = "test-key";
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ id: "ok", choices: [] })
    });

    await requestPerplexity({
      messages: [{ role: "user", content: "hello" }]
    });

    expect(global.fetch).toHaveBeenCalledTimes(1);
    expect(global.fetch).toHaveBeenCalledWith(
      PERPLEXITY_API_URL,
      expect.objectContaining({
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: "Bearer test-key"
        }
      })
    );
    const callBody = JSON.parse((global.fetch as jest.Mock).mock.calls[0][1].body);
    expect(callBody.messages).toEqual([{ role: "user", content: "hello" }]);
    expect(callBody.model).toBeDefined();
  });

  it("returns parsed payload on success", async () => {
    process.env.PERPLEXITY_API_KEY = "test-key";
    const payload = { id: "gen-1", choices: [{ message: { content: "Hi" } }] };
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => payload
    });

    const result = await requestPerplexity({
      messages: [{ role: "user", content: "hello" }]
    });

    expect(result).toEqual(payload);
  });

  it("retries on retryable status then succeeds", async () => {
    process.env.PERPLEXITY_API_KEY = "test-key";
    (global.fetch as jest.Mock)
      .mockResolvedValueOnce({
        ok: false,
        status: 503,
        json: async () => ({})
      })
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({ id: "ok" })
      });

    const result = await requestPerplexity({
      messages: [{ role: "user", content: "hello" }]
    });

    expect(result).toEqual({ id: "ok" });
    expect(mockSleep).toHaveBeenCalled();
    expect(mockIsRetryable).toHaveBeenCalledWith(503);
  });

  it("returns null for non-ok non-retryable response", async () => {
    process.env.PERPLEXITY_API_KEY = "test-key";
    mockIsRetryable.mockReturnValue(false);
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: false,
      status: 400,
      json: async () => ({ error: "Bad request" })
    });

    const result = await requestPerplexity({
      messages: [{ role: "user", content: "hello" }]
    });

    expect(result).toBeNull();
  });

  it("returns null when non-ok response body is not json", async () => {
    process.env.PERPLEXITY_API_KEY = "test-key";
    mockIsRetryable.mockReturnValue(false);
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: false,
      status: 500,
      json: async () => {
        throw new Error("not-json");
      }
    });

    const result = await requestPerplexity({
      messages: [{ role: "user", content: "hello" }]
    });

    expect(result).toBeNull();
  });

  it("returns null when fetch throws after retries exhausted", async () => {
    process.env.PERPLEXITY_API_KEY = "test-key";
    (global.fetch as jest.Mock).mockRejectedValue(new Error("Network error"));

    const result = await requestPerplexity({
      messages: [{ role: "user", content: "hello" }]
    });

    expect(result).toBeNull();
    expect(global.fetch).toHaveBeenCalledTimes(3);
  });

  it("uses request.model when provided", async () => {
    process.env.PERPLEXITY_API_KEY = "test-key";
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ id: "ok" })
    });

    await requestPerplexity({
      model: "sonar-reasoning",
      messages: [{ role: "user", content: "hello" }]
    });

    const callBody = JSON.parse((global.fetch as jest.Mock).mock.calls[0][1].body);
    expect(callBody.model).toBe("sonar-reasoning");
  });
});
