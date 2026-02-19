const mockGetCommunityDataProvider = jest.fn();
const mockGenerateTextForUseCase = jest.fn();

jest.mock("@web/src/server/services/communityData/config", () => ({
  CommunityDataProvider: {
    Perplexity: "perplexity",
    Google: "google"
  },
  getCommunityDataProvider: (...args: unknown[]) =>
    mockGetCommunityDataProvider(...args)
}));

jest.mock("@web/src/server/services/ai", () => ({
  generateTextForUseCase: (...args: unknown[]) =>
    mockGenerateTextForUseCase(...args)
}));

import { fetchCityDescription } from "@web/src/server/services/communityData/shared/cityDescription";

describe("shared cityDescription", () => {
  const logger = { warn: jest.fn() };

  beforeEach(() => {
    mockGetCommunityDataProvider.mockReset();
    mockGenerateTextForUseCase.mockReset();
    logger.warn.mockReset();
  });

  it("uses perplexity provider when community provider is perplexity", async () => {
    mockGetCommunityDataProvider.mockReturnValue("perplexity");
    mockGenerateTextForUseCase.mockResolvedValueOnce({
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
    expect(mockGenerateTextForUseCase).toHaveBeenCalledWith(
      expect.objectContaining({ useCase: "city_description" })
    );
  });

  it("uses anthropic provider when community provider is google", async () => {
    mockGetCommunityDataProvider.mockReturnValue("google");
    mockGenerateTextForUseCase.mockResolvedValueOnce({
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
    expect(mockGenerateTextForUseCase).toHaveBeenCalledWith(
      expect.objectContaining({ useCase: "city_description" })
    );
  });

  it("returns null when generateText returns null", async () => {
    mockGetCommunityDataProvider.mockReturnValue("google");
    mockGenerateTextForUseCase.mockResolvedValueOnce(null);

    await expect(
      fetchCityDescription("Austin", "TX", logger)
    ).resolves.toBeNull();
    expect(logger.warn).toHaveBeenCalled();
  });

  it("returns null when model result has no text", async () => {
    mockGetCommunityDataProvider.mockReturnValue("google");
    mockGenerateTextForUseCase.mockResolvedValueOnce({
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
    mockGenerateTextForUseCase.mockResolvedValueOnce({
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
