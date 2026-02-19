/** @jest-environment node */

const mockAnthropicComplete = jest.fn();
const mockAnthropicStream = jest.fn();
const mockPerplexityComplete = jest.fn();
const mockGetAiUseCaseConfig = jest.fn();

jest.mock("../providers/anthropic", () => ({
  anthropicTextStrategy: { complete: (...args: unknown[]) => mockAnthropicComplete(...args) },
  anthropicStructuredStreamStrategy: { stream: (...args: unknown[]) => mockAnthropicStream(...args) }
}));

jest.mock("../providers/perplexity", () => ({
  perplexityTextStrategy: { complete: (...args: unknown[]) => mockPerplexityComplete(...args) }
}));

jest.mock("../config", () => ({
  getAiUseCaseConfig: (...args: unknown[]) => mockGetAiUseCaseConfig(...args)
}));

import {
  generateStructuredStream,
  generateStructuredStreamForUseCase,
  generateText,
  generateTextForUseCase
} from "../service";

describe("server/services/ai/service", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGetAiUseCaseConfig.mockReturnValue({
      provider: "anthropic",
      model: "configured-model",
      maxTokens: 222,
      betaHeader: "beta"
    });
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

  it("routes text generation through use-case config", async () => {
    mockGetAiUseCaseConfig.mockReturnValueOnce({
      provider: "perplexity",
      model: undefined,
      maxTokens: 900,
      temperature: undefined
    });
    mockPerplexityComplete.mockResolvedValueOnce({
      provider: "perplexity",
      text: "ok",
      raw: {}
    });

    const result = await generateTextForUseCase({
      useCase: "market_data",
      messages: [{ role: "user", content: "hello" }]
    });

    expect(mockGetAiUseCaseConfig).toHaveBeenCalledWith("market_data");
    expect(mockPerplexityComplete).toHaveBeenCalledWith(
      expect.objectContaining({ provider: "perplexity", maxTokens: 900 })
    );
    expect(result).toEqual({ provider: "perplexity", text: "ok", raw: {} });
  });

  it("routes stream generation through use-case config", async () => {
    const response = new Response("stream");
    mockAnthropicStream.mockResolvedValueOnce(response);

    const result = await generateStructuredStreamForUseCase({
      useCase: "content_generation_stream",
      system: "sys",
      messages: [{ role: "user", content: "hello" }],
      outputFormat: { type: "json_schema" }
    });

    expect(mockGetAiUseCaseConfig).toHaveBeenCalledWith("content_generation_stream");
    expect(mockAnthropicStream).toHaveBeenCalledWith(
      expect.objectContaining({
        provider: "anthropic",
        model: "configured-model",
        maxTokens: 222,
        betaHeader: "beta"
      })
    );
    expect(result).toBe(response);
  });
});
