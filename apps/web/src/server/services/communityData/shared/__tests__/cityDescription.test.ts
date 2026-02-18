const mockGetCommunityDataProvider = jest.fn();
const mockFetchPerplexityCityDescription = jest.fn();

jest.mock("@web/src/server/services/communityData/config", () => ({
  CommunityDataProvider: {
    Perplexity: "perplexity",
    Google: "google"
  },
  getCommunityDataProvider: (...args: unknown[]) =>
    mockGetCommunityDataProvider(...args)
}));

jest.mock(
  "@web/src/server/services/communityData/providers/perplexity/pipeline/cityDescription",
  () => ({
    fetchPerplexityCityDescription: (...args: unknown[]) =>
      mockFetchPerplexityCityDescription(...args)
  })
);

import { fetchCityDescription } from "@web/src/server/services/communityData/shared/cityDescription";

describe("shared cityDescription", () => {
  const originalFetch = global.fetch;
  const originalApiKey = process.env.ANTHROPIC_API_KEY;
  const logger = { warn: jest.fn() };

  beforeEach(() => {
    mockGetCommunityDataProvider.mockReset();
    mockFetchPerplexityCityDescription.mockReset();
    logger.warn.mockReset();
    global.fetch = jest.fn();
  });

  afterEach(() => {
    process.env.ANTHROPIC_API_KEY = originalApiKey;
  });

  afterAll(() => {
    global.fetch = originalFetch;
  });

  it("delegates to perplexity provider when selected", async () => {
    mockGetCommunityDataProvider.mockReturnValue("perplexity");
    mockFetchPerplexityCityDescription.mockResolvedValueOnce({
      description: "A great city"
    });

    await expect(fetchCityDescription("Austin", "TX", logger)).resolves.toEqual(
      {
        description: "A great city"
      }
    );
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it("returns null when anthropic key is missing", async () => {
    mockGetCommunityDataProvider.mockReturnValue("google");
    delete process.env.ANTHROPIC_API_KEY;

    await expect(
      fetchCityDescription("Austin", "TX", logger)
    ).resolves.toBeNull();
    expect(logger.warn).toHaveBeenCalled();
  });

  it("requests anthropic and parses response", async () => {
    mockGetCommunityDataProvider.mockReturnValue("google");
    process.env.ANTHROPIC_API_KEY = "key";
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({
        content: [{ type: "text", text: " Austin is vibrant. " }]
      })
    });

    await expect(fetchCityDescription("Austin", "TX", logger)).resolves.toEqual(
      {
        description: "Austin is vibrant."
      }
    );
  });

  it("returns null when anthropic response is not ok", async () => {
    mockGetCommunityDataProvider.mockReturnValue("google");
    process.env.ANTHROPIC_API_KEY = "key";
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: false,
      status: 500,
      json: async () => ({})
    });

    await expect(
      fetchCityDescription("Austin", "TX", logger)
    ).resolves.toBeNull();
    expect(logger.warn).toHaveBeenCalled();
  });

  it("returns null when anthropic payload has no text content", async () => {
    mockGetCommunityDataProvider.mockReturnValue("google");
    process.env.ANTHROPIC_API_KEY = "key";
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({ content: [{ type: "tool_use", text: "ignored" }] })
    });

    await expect(
      fetchCityDescription("Austin", "TX", logger)
    ).resolves.toBeNull();
  });

  it("returns null when anthropic text is only whitespace", async () => {
    mockGetCommunityDataProvider.mockReturnValue("google");
    process.env.ANTHROPIC_API_KEY = "key";
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({ content: [{ type: "text", text: "   " }] })
    });

    await expect(
      fetchCityDescription("Austin", "TX", logger)
    ).resolves.toBeNull();
  });
});
