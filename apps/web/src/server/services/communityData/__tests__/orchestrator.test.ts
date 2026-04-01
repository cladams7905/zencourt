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

  it("returns empty content context when zip code is missing", async () => {
    mockCreateRegistry.mockReturnValue({
      getPrimaryProvider: () => ({}),
      getFallbackProvider: () => null
    });

    const orchestrator = createCommunityDataOrchestrator();
    const result = await orchestrator.getCommunityContentContext({
      category: "community",
      zipCode: ""
    });

    expect(result).toEqual({
      communityData: null,
      cityDescription: null,
      communityCategoryKeys: null,
      seasonalExtraSections: null
    });
  });

  it("prefetches next categories and derives available category keys from returned data", async () => {
    const primary = {
      provider: "perplexity",
      getCommunityDataByZip: jest.fn(),
      getCommunityDataByZipAndAudience: jest.fn(),
      getMonthlyEventsSectionByZip: jest.fn().mockResolvedValue({
        key: "things_to_do_february",
        value: "Events"
      }),
      getCommunityDataByZipAndAudienceForCategories: jest.fn().mockResolvedValue({
        dining_list: "Cafe A",
        shopping_list: "Mall B",
        neighborhoods_list: "(none found)",
        seasonal_geo_sections: {
          things_to_do_february: "Festival"
        }
      }),
      prefetchCategoriesByZip: jest.fn()
    };
    mockCreateRegistry.mockReturnValue({
      getPrimaryProvider: () => primary,
      getFallbackProvider: () => null
    });

    const orchestrator = createCommunityDataOrchestrator();
    const result = await orchestrator.getCommunityContentContext({
      category: "community",
      zipCode: "78701",
      nextCommunityCategoryKeys: ["shopping_list"],
      selectedCommunityCategoryKeys: null
    });

    expect(result.communityCategoryKeys).toEqual(["dining_list", "shopping_list"]);
    expect(primary.prefetchCategoriesByZip).toHaveBeenCalledWith(
      expect.objectContaining({
        zipCode: "78701",
        categories: ["shopping"]
      })
    );
  });

  it("falls back to by-zip-and-audience lookup when category capabilities are unavailable", async () => {
    const primary = {
      provider: "perplexity",
      getCommunityDataByZip: jest.fn(),
      getCommunityDataByZipAndAudience: jest
        .fn()
        .mockRejectedValue(new Error("boom"))
    };
    const fallback = {
      provider: "google",
      getCommunityDataByZip: jest.fn(),
      getCommunityDataByZipAndAudience: jest
        .fn()
        .mockResolvedValue({ dining_list: "Cafe A" })
    };
    mockCreateRegistry.mockReturnValue({
      getPrimaryProvider: () => primary,
      getFallbackProvider: () => fallback
    });

    const orchestrator = createCommunityDataOrchestrator();
    const result = await orchestrator.getCommunityContentContext({
      category: "community",
      zipCode: "78701",
      audienceSegment: "relocators"
    });

    expect(primary.getCommunityDataByZipAndAudience).toHaveBeenCalled();
    expect(fallback.getCommunityDataByZipAndAudience).toHaveBeenCalled();
    expect(result.communityData).toEqual({ dining_list: "Cafe A" });
  });
});
