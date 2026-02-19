const mockGetCommunityDataProvider = jest.fn();
const mockGenerateText = jest.fn();

jest.mock("@web/src/server/services/communityData/config", () => ({
  CommunityDataProvider: {
    Perplexity: "perplexity",
    Google: "google"
  },
  getCommunityDataProvider: (...args: unknown[]) =>
    mockGetCommunityDataProvider(...args)
}));

jest.mock("@web/src/server/services/ai", () => ({
  generateText: (...args: unknown[]) => mockGenerateText(...args)
}));

import { fetchCityDescription } from "@web/src/server/services/communityData/shared/cityDescription";

describe("shared cityDescription", () => {
  const originalProvider = process.env.CITY_DESCRIPTION_PROVIDER;
  const logger = { warn: jest.fn() };

  beforeEach(() => {
    mockGetCommunityDataProvider.mockReset();
    mockGenerateText.mockReset();
    logger.warn.mockReset();
  });

  afterEach(() => {
    process.env.CITY_DESCRIPTION_PROVIDER = originalProvider;
  });

  it("uses perplexity provider when community provider is perplexity", async () => {
    mockGetCommunityDataProvider.mockReturnValue("perplexity");
    mockGenerateText.mockResolvedValueOnce({
      provider: "perplexity",
      text: JSON.stringify({
        description: "A great city",
        citations: [{ title: "Ref", url: "https://ref.test", source: "Ref" }]
      }),
      raw: {}
    });

    await expect(fetchCityDescription("Austin", "TX", logger)).resolves.toEqual(
      {
        description: "A great city",
        citations: [{ title: "Ref", url: "https://ref.test", source: "Ref" }]
      }
    );
    expect(mockGenerateText).toHaveBeenCalledWith(
      expect.objectContaining({ provider: "perplexity" })
    );
  });

  it("uses anthropic provider when community provider is google", async () => {
    mockGetCommunityDataProvider.mockReturnValue("google");
    mockGenerateText.mockResolvedValueOnce({
      provider: "anthropic",
      text: " Austin is vibrant. ",
      raw: {}
    });

    await expect(
      fetchCityDescription("Austin", "TX", logger)
    ).resolves.toEqual({
      description: "Austin is vibrant.",
      citations: null
    });
    expect(mockGenerateText).toHaveBeenCalledWith(
      expect.objectContaining({ provider: "anthropic" })
    );
  });

  it("uses provider override when CITY_DESCRIPTION_PROVIDER is set", async () => {
    mockGetCommunityDataProvider.mockReturnValue("google");
    process.env.CITY_DESCRIPTION_PROVIDER = "perplexity";
    mockGenerateText.mockResolvedValueOnce({
      provider: "perplexity",
      text: "Austin is vibrant.",
      raw: {}
    });

    await expect(fetchCityDescription("Austin", "TX", logger)).resolves.toEqual(
      {
        description: "Austin is vibrant.",
        citations: null
      }
    );
    expect(mockGenerateText).toHaveBeenCalledWith(
      expect.objectContaining({ provider: "perplexity" })
    );
  });

  it("returns null when generateText returns null", async () => {
    mockGetCommunityDataProvider.mockReturnValue("google");
    mockGenerateText.mockResolvedValueOnce(null);

    await expect(
      fetchCityDescription("Austin", "TX", logger)
    ).resolves.toBeNull();
    expect(logger.warn).toHaveBeenCalled();
  });

  it("returns null when model result has no text", async () => {
    mockGetCommunityDataProvider.mockReturnValue("google");
    mockGenerateText.mockResolvedValueOnce({
      provider: "anthropic",
      text: null,
      raw: {}
    });

    await expect(
      fetchCityDescription("Austin", "TX", logger)
    ).resolves.toBeNull();
  });

  it("uses result citations when plain text output is returned", async () => {
    mockGetCommunityDataProvider.mockReturnValue("google");
    mockGenerateText.mockResolvedValueOnce({
      provider: "perplexity",
      text: "Austin is vibrant.",
      citations: [{ title: "Source", url: "https://src.test", source: "S" }],
      raw: {}
    });

    await expect(
      fetchCityDescription("Austin", "TX", logger)
    ).resolves.toEqual({
      description: "Austin is vibrant.",
      citations: [{ title: "Source", url: "https://src.test", source: "S" }]
    });
  });
});
