/** @jest-environment node */

const originalFetch = global.fetch;
const originalApiKey = process.env.ANTHROPIC_API_KEY;

jest.mock("@web/src/lib/core/logging/logger", () => ({
  logger: {},
  createChildLogger: () => ({
    warn: jest.fn(),
    error: jest.fn(),
    info: jest.fn()
  })
}));

import {
  requestAnthropic,
  requestAnthropicStream
} from "@web/src/server/services/_integrations/anthropic/client";
import { ANTHROPIC_API_URL } from "@web/src/server/services/_integrations/anthropic/constants";
import type { AnthropicRequest } from "@web/src/server/services/_integrations/anthropic/types";

describe("anthropic client", () => {
  beforeEach(() => {
    (global as { fetch?: typeof fetch }).fetch = jest.fn();
  });

  afterEach(() => {
    process.env.ANTHROPIC_API_KEY = originalApiKey;
  });

  afterAll(() => {
    global.fetch = originalFetch;
  });

  describe("requestAnthropic", () => {
    it("returns null when ANTHROPIC_API_KEY is not set", async () => {
      delete process.env.ANTHROPIC_API_KEY;

      const result = await requestAnthropic({
        model: "claude-3-5-sonnet",
        max_tokens: 100,
        messages: [{ role: "user", content: "hi" }]
      });

      expect(result).toBeNull();
      expect(global.fetch).not.toHaveBeenCalled();
    });

    it("POSTs to Anthropic API with correct headers and body", async () => {
      process.env.ANTHROPIC_API_KEY = "test-key";
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ content: [{ text: "Hello" }] })
      });

      const request: AnthropicRequest = {
        model: "claude-3-5-sonnet",
        max_tokens: 100,
        messages: [{ role: "user", content: "hi" }]
      };
      await requestAnthropic(request);

      expect(global.fetch).toHaveBeenCalledTimes(1);
      expect(global.fetch).toHaveBeenCalledWith(ANTHROPIC_API_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": "test-key",
          "anthropic-version": "2023-06-01"
        },
        body: JSON.stringify(request)
      });
    });

    it("returns parsed JSON payload on success", async () => {
      process.env.ANTHROPIC_API_KEY = "test-key";
      const payload = { content: [{ type: "text", text: "Hello" }] };
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => payload
      });

      const result = await requestAnthropic({
        model: "claude-3-5-sonnet",
        max_tokens: 100,
        messages: [{ role: "user", content: "hi" }]
      });

      expect(result).toEqual(payload);
    });

    it("returns null on non-ok response", async () => {
      process.env.ANTHROPIC_API_KEY = "test-key";
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        status: 429,
        json: async () => ({ error: { type: "rate_limit" } })
      });

      const result = await requestAnthropic({
        model: "claude-3-5-sonnet",
        max_tokens: 100,
        messages: [{ role: "user", content: "hi" }]
      });

      expect(result).toBeNull();
    });

  });

  describe("requestAnthropicStream", () => {
    it("throws when ANTHROPIC_API_KEY is not set", async () => {
      delete process.env.ANTHROPIC_API_KEY;

      await expect(
        requestAnthropicStream({
          request: {
            model: "claude-3-5-sonnet",
            max_tokens: 100,
            messages: [{ role: "user", content: "hi" }]
          }
        })
      ).rejects.toThrow("ANTHROPIC_API_KEY is not configured");

      expect(global.fetch).not.toHaveBeenCalled();
    });

    it("returns fetch Response on success", async () => {
      process.env.ANTHROPIC_API_KEY = "test-key";
      const mockResponse = new Response("stream", {
        status: 200,
        headers: { "content-type": "text/event-stream" }
      });
      (global.fetch as jest.Mock).mockResolvedValueOnce(mockResponse);

      const result = await requestAnthropicStream({
        request: {
          model: "claude-3-5-sonnet",
          max_tokens: 100,
          messages: [{ role: "user", content: "hi" }]
        }
      });

      expect(result).toBe(mockResponse);
      expect(global.fetch).toHaveBeenCalledWith(
        ANTHROPIC_API_URL,
        expect.objectContaining({
          method: "POST",
          headers: expect.not.objectContaining({ "anthropic-beta": expect.anything() })
        })
      );
    });

    it("includes anthropic-beta header when betaHeader is provided", async () => {
      process.env.ANTHROPIC_API_KEY = "test-key";
      (global.fetch as jest.Mock).mockResolvedValueOnce(new Response());

      await requestAnthropicStream({
        request: {
          model: "claude-3-5-sonnet",
          max_tokens: 100,
          messages: [{ role: "user", content: "hi" }]
        },
        betaHeader: "some-beta"
      });

      expect(global.fetch).toHaveBeenCalledWith(
        ANTHROPIC_API_URL,
        expect.objectContaining({
          headers: expect.objectContaining({
            "anthropic-beta": "some-beta"
          })
        })
      );
    });
  });
});
