/** @jest-environment node */

import {
  anthropicStructuredStreamStrategy,
  anthropicTextStrategy
} from "../anthropic";

describe("ai/strategies/anthropic", () => {
  const originalFetch = global.fetch;
  const originalKey = process.env.ANTHROPIC_API_KEY;

  beforeEach(() => {
    jest.clearAllMocks();
    global.fetch = jest.fn();
  });

  afterEach(() => {
    process.env.ANTHROPIC_API_KEY = originalKey;
  });

  afterAll(() => {
    global.fetch = originalFetch;
  });

  it("returns null when api key is missing for text completion", async () => {
    delete process.env.ANTHROPIC_API_KEY;

    await expect(
      anthropicTextStrategy.complete({
        provider: "anthropic",
        messages: [{ role: "user", content: "hello" }]
      })
    ).resolves.toBeNull();

    expect(global.fetch).not.toHaveBeenCalled();
  });

  it("returns null when provider response is non-ok", async () => {
    process.env.ANTHROPIC_API_KEY = "key";
    (global.fetch as jest.Mock).mockResolvedValueOnce(
      new Response(JSON.stringify({ error: "bad" }), { status: 500 })
    );

    await expect(
      anthropicTextStrategy.complete({
        provider: "anthropic",
        messages: [{ role: "user", content: "hello" }]
      })
    ).resolves.toBeNull();
  });

  it("returns text payload on successful completion", async () => {
    process.env.ANTHROPIC_API_KEY = "key";
    (global.fetch as jest.Mock).mockResolvedValueOnce(
      new Response(
        JSON.stringify({ content: [{ type: "text", text: "hello world" }] }),
        { status: 200 }
      )
    );

    await expect(
      anthropicTextStrategy.complete({
        provider: "anthropic",
        model: "test-model",
        system: "system",
        maxTokens: 300,
        messages: [{ role: "user", content: "hello" }]
      })
    ).resolves.toEqual(
      expect.objectContaining({
        provider: "anthropic",
        text: "hello world"
      })
    );
  });

  it("throws for stream when api key is missing", async () => {
    delete process.env.ANTHROPIC_API_KEY;

    await expect(
      anthropicStructuredStreamStrategy.stream({
        provider: "anthropic",
        model: "test-model",
        system: "system",
        maxTokens: 100,
        messages: [{ role: "user", content: "hello" }],
        outputFormat: { type: "json_schema" }
      })
    ).rejects.toThrow("ANTHROPIC_API_KEY is not configured");
  });

  it("returns fetch response for structured stream", async () => {
    process.env.ANTHROPIC_API_KEY = "key";
    const response = new Response("stream", { status: 200 });
    (global.fetch as jest.Mock).mockResolvedValueOnce(response);

    const result = await anthropicStructuredStreamStrategy.stream({
      provider: "anthropic",
      model: "test-model",
      system: "system",
      maxTokens: 100,
      messages: [{ role: "user", content: "hello" }],
      outputFormat: { type: "json_schema" },
      betaHeader: "beta-header"
    });

    expect(result).toBe(response);
    expect(global.fetch).toHaveBeenCalled();
  });
});
