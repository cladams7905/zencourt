const mockBackoff = jest.fn();
const mockIsRetryable = jest.fn();
const mockSleep = jest.fn();

jest.mock("@web/src/server/utils/retry", () => ({
  getExponentialBackoffDelayMs: (...args: unknown[]) => mockBackoff(...args),
  isRetryableHttpStatus: (...args: unknown[]) => mockIsRetryable(...args),
  sleep: (...args: unknown[]) => mockSleep(...args)
}));

import { requestPerplexity } from "@web/src/server/integrations/perplexity";

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
    global.fetch = jest.fn();
  });

  afterEach(() => {
    process.env.PERPLEXITY_API_KEY = originalApiKey;
  });

  afterAll(() => {
    global.fetch = originalFetch;
  });

  it("returns null when api key is missing", async () => {
    delete process.env.PERPLEXITY_API_KEY;

    await expect(
      requestPerplexity({
        messages: [{ role: "user", content: "hello" }] as never
      })
    ).resolves.toBeNull();
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it("returns parsed payload on success", async () => {
    process.env.PERPLEXITY_API_KEY = "test-key";
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({ id: "ok" })
    });

    await expect(
      requestPerplexity({
        messages: [{ role: "user", content: "hello" }] as never
      })
    ).resolves.toEqual({ id: "ok" });
  });

  it("retries on retryable status and then succeeds", async () => {
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

    await expect(
      requestPerplexity({
        messages: [{ role: "user", content: "hello" }] as never
      })
    ).resolves.toEqual({ id: "ok" });
    expect(mockSleep).toHaveBeenCalled();
  });

  it("returns null for non-ok response", async () => {
    process.env.PERPLEXITY_API_KEY = "test-key";
    mockIsRetryable.mockReturnValue(false);
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: false,
      status: 400,
      json: async () => ({})
    });

    await expect(
      requestPerplexity({
        messages: [{ role: "user", content: "hello" }] as never
      })
    ).resolves.toBeNull();
  });
});
