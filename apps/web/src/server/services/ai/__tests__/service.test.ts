/** @jest-environment node */

const mockAnthropicComplete = jest.fn();
const mockAnthropicStream = jest.fn();
const mockPerplexityComplete = jest.fn();

jest.mock("../strategies/anthropic", () => ({
  anthropicTextStrategy: { complete: (...args: unknown[]) => mockAnthropicComplete(...args) },
  anthropicStructuredStreamStrategy: { stream: (...args: unknown[]) => mockAnthropicStream(...args) }
}));

jest.mock("../strategies/perplexity", () => ({
  perplexityTextStrategy: { complete: (...args: unknown[]) => mockPerplexityComplete(...args) }
}));

import { generateStructuredStream, generateText } from "../service";

describe("server/services/ai/service", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("routes text generation to anthropic strategy", async () => {
    mockAnthropicComplete.mockResolvedValueOnce({ provider: "anthropic", text: "ok", raw: {} });

    const result = await generateText({
      provider: "anthropic",
      messages: [{ role: "user", content: "hello" }]
    });

    expect(mockAnthropicComplete).toHaveBeenCalled();
    expect(result).toEqual({ provider: "anthropic", text: "ok", raw: {} });
  });

  it("routes text generation to perplexity strategy", async () => {
    mockPerplexityComplete.mockResolvedValueOnce({ provider: "perplexity", text: "ok", raw: {} });

    const result = await generateText({
      provider: "perplexity",
      messages: [{ role: "user", content: "hello" }]
    });

    expect(mockPerplexityComplete).toHaveBeenCalled();
    expect(result).toEqual({ provider: "perplexity", text: "ok", raw: {} });
  });

  it("routes structured stream to anthropic strategy", async () => {
    const response = new Response("stream");
    mockAnthropicStream.mockResolvedValueOnce(response);

    const result = await generateStructuredStream({
      provider: "anthropic",
      model: "model",
      system: "sys",
      messages: [{ role: "user", content: "hello" }],
      maxTokens: 100,
      outputFormat: { type: "json_schema" }
    });

    expect(mockAnthropicStream).toHaveBeenCalled();
    expect(result).toBe(response);
  });
});
