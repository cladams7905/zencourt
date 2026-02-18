const mockRequestPerplexity = jest.fn();

jest.mock(
  "@web/src/server/services/communityData/providers/perplexity/transport/client",
  () => ({
    requestPerplexity: (...args: unknown[]) => mockRequestPerplexity(...args)
  })
);

import { fetchPerplexityCityDescription } from "@web/src/server/services/communityData/providers/perplexity/pipeline/cityDescription";

describe("perplexity city description", () => {
  beforeEach(() => {
    mockRequestPerplexity.mockReset();
  });

  it("returns null when request fails", async () => {
    mockRequestPerplexity.mockResolvedValueOnce(null);
    await expect(
      fetchPerplexityCityDescription("Austin", "TX")
    ).resolves.toBeNull();
  });

  it("returns null on invalid JSON", async () => {
    mockRequestPerplexity.mockResolvedValueOnce({
      choices: [{ message: { content: "not-json" } }]
    });
    await expect(
      fetchPerplexityCityDescription("Austin", "TX")
    ).resolves.toBeNull();
  });

  it("returns trimmed description payload", async () => {
    mockRequestPerplexity.mockResolvedValueOnce({
      choices: [
        {
          message: {
            content: JSON.stringify({
              description: "  Vibrant city with parks.  ",
              citations: [{ title: "Source", url: "https://example.com" }]
            })
          }
        }
      ]
    });

    await expect(
      fetchPerplexityCityDescription("Austin", "TX")
    ).resolves.toEqual({
      description: "Vibrant city with parks.",
      citations: [{ title: "Source", url: "https://example.com" }]
    });
  });
});
