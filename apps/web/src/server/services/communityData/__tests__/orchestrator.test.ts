const mockCreateRegistry = jest.fn();
const mockSelectCommunityCategories = jest.fn();
const mockPeekNextCommunityCategories = jest.fn();

jest.mock("@web/src/server/services/communityData/registry", () => ({
  createCommunityDataProviderRegistry: (...args: unknown[]) =>
    mockCreateRegistry(...args)
}));

jest.mock("@web/src/server/services/contentRotation", () => ({
  COMMUNITY_CATEGORY_KEYS: ["dining_list", "community_events_list"],
  COMMUNITY_CATEGORY_KEY_TO_CATEGORY: {
    dining_list: "dining",
    community_events_list: "community_events"
  },
  selectCommunityCategories: (...args: unknown[]) =>
    mockSelectCommunityCategories(...args),
  peekNextCommunityCategories: (...args: unknown[]) =>
    mockPeekNextCommunityCategories(...args)
}));

import { createCommunityDataOrchestrator } from "../orchestrator";

describe("communityData/orchestrator", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("falls back when primary getCommunityDataByZip fails", async () => {
    const primary = {
      provider: "perplexity",
      getCommunityDataByZip: jest.fn().mockRejectedValue(new Error("boom")),
      getCommunityDataByZipAndAudience: jest.fn(),
      getCityDescription: jest.fn()
    };
    const fallback = {
      provider: "google",
      getCommunityDataByZip: jest.fn().mockResolvedValue({ zip_code: "78701" }),
      getCommunityDataByZipAndAudience: jest.fn(),
      getCityDescription: jest.fn()
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
      }),
      getCityDescription: jest.fn().mockResolvedValue("Austin description")
    };
    mockCreateRegistry.mockReturnValue({
      getPrimaryProvider: () => primary,
      getFallbackProvider: () => null
    });

    const orchestrator = createCommunityDataOrchestrator();
    const result = await orchestrator.getCommunityContentContext({
      redis: null,
      userId: "user-1",
      category: "seasonal",
      zipCode: "78701",
      preferredCity: "Austin",
      preferredState: "TX"
    });

    expect(result.seasonalExtraSections).toEqual({
      things_to_do_february: "- Event"
    });
    expect(result.cityDescription).toBe("Austin description");
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
      prefetchCategoriesByZip: jest.fn(),
      getCityDescription: jest.fn().mockResolvedValue("Austin")
    };
    mockCreateRegistry.mockReturnValue({
      getPrimaryProvider: () => primary,
      getFallbackProvider: () => null
    });
    mockSelectCommunityCategories
      .mockResolvedValueOnce({
        selected: ["dining_list"],
        shouldRefresh: true
      })
      .mockResolvedValueOnce({
        selected: ["dining_list"],
        shouldRefresh: false
      });
    mockPeekNextCommunityCategories.mockResolvedValue([]);

    const orchestrator = createCommunityDataOrchestrator();
    await orchestrator.getCommunityContentContext({
      redis: null,
      userId: "user-1",
      category: "community",
      zipCode: "78701",
      preferredCity: "Austin",
      preferredState: "TX"
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
