const mockCreateRegistry = jest.fn();

jest.mock("@web/src/server/services/communityData/registry", () => ({
  createCommunityDataProviderRegistry: (...args: unknown[]) =>
    mockCreateRegistry(...args)
}));

import { createCommunityDataOrchestrator } from "../service";

describe("communityData/orchestrator", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("falls back when primary getCommunityDataByZip fails", async () => {
    const primary = {
      provider: "perplexity",
      getCommunityDataByZip: jest.fn().mockRejectedValue(new Error("boom")),
      getCommunityDataByZipAndAudience: jest.fn()
    };
    const fallback = {
      provider: "google",
      getCommunityDataByZip: jest.fn().mockResolvedValue({ zip_code: "78701" }),
      getCommunityDataByZipAndAudience: jest.fn()
    };
    mockCreateRegistry.mockReturnValue({
      getPrimaryProvider: () => primary,
      getFallbackProvider: () => fallback
    });

    const orchestrator = createCommunityDataOrchestrator();
    const result = await orchestrator.getCommunityDataByZip("78701");

    expect(result).toEqual({ zip_code: "78701" });
    expect(primary.getCommunityDataByZip).toHaveBeenCalled();
    expect(fallback.getCommunityDataByZip).toHaveBeenCalled();
  });

  it("builds seasonal content context via provider capabilities", async () => {
    const primary = {
      provider: "perplexity",
      getCommunityDataByZip: jest.fn(),
      getCommunityDataByZipAndAudience: jest.fn(),
      getMonthlyEventsSectionByZip: jest.fn().mockResolvedValue({
        key: "things_to_do_february",
        value: "- Event"
      })
    };
    mockCreateRegistry.mockReturnValue({
      getPrimaryProvider: () => primary,
      getFallbackProvider: () => null
    });

    const orchestrator = createCommunityDataOrchestrator();
    const result = await orchestrator.getCommunityContentContext({
      category: "seasonal",
      zipCode: "78701",
      preferredCity: "Austin",
      preferredState: "TX"
    });

    expect(result.seasonalExtraSections).toEqual({
      things_to_do_february: "- Event"
    });
    expect(result.cityDescription).toBeNull();
  });

  it("passes avoid recommendations to provider for category-based community flow", async () => {
    const primary = {
      provider: "perplexity",
      getCommunityDataByZip: jest.fn(),
      getCommunityDataByZipAndAudience: jest.fn(),
      getMonthlyEventsSectionByZip: jest.fn().mockResolvedValue(null),
      getAvoidRecommendationsForCategories: jest
        .fn()
        .mockResolvedValue({ dining: ["Cafe A"] }),
      getCommunityDataByZipAndAudienceForCategories: jest
        .fn()
        .mockResolvedValue({ dining_list: "Cafe A" }),
      prefetchCategoriesByZip: jest.fn()
    };
    mockCreateRegistry.mockReturnValue({
      getPrimaryProvider: () => primary,
      getFallbackProvider: () => null
    });

    const orchestrator = createCommunityDataOrchestrator();
    await orchestrator.getCommunityContentContext({
      category: "community",
      zipCode: "78701",
      preferredCity: "Austin",
      preferredState: "TX",
      selectedCommunityCategoryKeys: ["dining_list"],
      shouldRefreshCommunityCategories: true,
      nextCommunityCategoryKeys: []
    });

    expect(primary.getAvoidRecommendationsForCategories).toHaveBeenCalled();
    expect(primary.getCommunityDataByZipAndAudienceForCategories).toHaveBeenCalledWith(
      expect.objectContaining({
        options: expect.objectContaining({
          forceRefresh: true,
          avoidRecommendations: { dining: ["Cafe A"] }
        })
      })
    );
  });
});
