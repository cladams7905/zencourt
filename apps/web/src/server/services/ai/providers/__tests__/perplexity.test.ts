/** @jest-environment node */

const mockRequestPerplexity = jest.fn();

jest.mock("@web/src/server/services/communityData/providers/perplexity", () => ({
  requestPerplexity: (...args: unknown[]) => mockRequestPerplexity(...args)
}));

import { perplexityTextStrategy } from "../perplexity";

describe("ai/strategies/perplexity", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("returns null when provider transport returns null", async () => {
    mockRequestPerplexity.mockResolvedValueOnce(null);

    await expect(
      perplexityTextStrategy.complete({
        provider: "perplexity",
        messages: [{ role: "user", content: "hello" }]
      })
    ).resolves.toBeNull();
  });

  it("maps content text and citations", async () => {
    mockRequestPerplexity.mockResolvedValueOnce({
      choices: [{ message: { content: "json payload" } }],
      search_results: [
        { title: "A", url: "https://a.test", source: "Source A" },
        { title: "B", url: "https://b.test", date: "2026-01-01" }
      ]
    });

    await expect(
      perplexityTextStrategy.complete({
        provider: "perplexity",
        messages: [{ role: "user", content: "hello" }],
        maxTokens: 400
      })
    ).resolves.toEqual(
      expect.objectContaining({
        provider: "perplexity",
        text: "json payload",
        citations: [
          { title: "A", url: "https://a.test", source: "Source A" },
          { title: "B", url: "https://b.test", source: "2026-01-01" }
        ]
      })
    );
  });
});
