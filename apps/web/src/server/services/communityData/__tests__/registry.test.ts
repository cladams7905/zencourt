const mockGetPerplexityCommunityData = jest.fn();
const mockGetPerplexityByCategories = jest.fn();
const mockGetPerplexityMonthlyEvents = jest.fn();
const mockPrefetchPerplexityCategories = jest.fn();
const mockGetGoogleByZip = jest.fn();
const mockGetGoogleByZipAndAudience = jest.fn();
const mockGetCityDescription = jest.fn();
const mockResolveLocationOrWarn = jest.fn();
const mockToOriginLocationInput = jest.fn();
const mockGetCachedPerplexityCategoryPayload = jest.fn();

jest.mock(
  "@web/src/server/services/communityData/providers/perplexity",
  () => ({
    getPerplexityCommunityData: (...args: unknown[]) =>
      mockGetPerplexityCommunityData(...args),
    getPerplexityCommunityDataByZipAndAudienceForCategories: (
      ...args: unknown[]
    ) => mockGetPerplexityByCategories(...args),
    getPerplexityMonthlyEventsSectionByZip: (...args: unknown[]) =>
      mockGetPerplexityMonthlyEvents(...args),
    prefetchPerplexityCategoriesByZip: (...args: unknown[]) =>
      mockPrefetchPerplexityCategories(...args)
  })
);

jest.mock("@web/src/server/services/communityData/providers/google", () => ({
  getCommunityDataByZip: (...args: unknown[]) => mockGetGoogleByZip(...args),
  getCommunityDataByZipAndAudience: (...args: unknown[]) =>
    mockGetGoogleByZipAndAudience(...args),
  getCityDescription: (...args: unknown[]) => mockGetCityDescription(...args),
  resolveLocationOrWarn: (...args: unknown[]) =>
    mockResolveLocationOrWarn(...args),
  toOriginLocationInput: (...args: unknown[]) =>
    mockToOriginLocationInput(...args)
}));

jest.mock(
  "@web/src/server/services/communityData/providers/perplexity/cache",
  () => ({
    getCachedPerplexityCategoryPayload: (...args: unknown[]) =>
      mockGetCachedPerplexityCategoryPayload(...args)
  })
);

import { createCommunityDataProviderRegistry } from "../registry";

describe("communityData/providerRegistry", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    process.env.COMMUNITY_DATA_PROVIDER = "";
    mockResolveLocationOrWarn.mockResolvedValue({
      city: "Austin",
      state_id: "TX",
      lat: 1,
      lng: 2
    });
    mockToOriginLocationInput.mockReturnValue({
      city: "Austin",
      state: "TX",
      lat: 1,
      lng: 2
    });
  });

  it("uses perplexity as default primary provider with google fallback", () => {
    const registry = createCommunityDataProviderRegistry();
    expect(registry.getPrimaryProvider().provider).toBe("perplexity");
    expect(registry.getFallbackProvider()?.provider).toBe("google");
  });

  it("uses google as primary provider with no fallback when configured", () => {
    process.env.COMMUNITY_DATA_PROVIDER = "google";
    const registry = createCommunityDataProviderRegistry();
    expect(registry.getPrimaryProvider().provider).toBe("google");
    expect(registry.getFallbackProvider()).toBeNull();
  });

  it("exposes perplexity avoid-recommendation capability", async () => {
    const registry = createCommunityDataProviderRegistry();
    const provider = registry.getPrimaryProvider();
    mockGetCachedPerplexityCategoryPayload
      .mockResolvedValueOnce({
        items: [{ name: "Spot A" }, { name: "Spot A" }]
      })
      .mockResolvedValueOnce({ items: [{ name: "Spot B" }] });

    const result = await provider.getAvoidRecommendationsForCategories?.({
      zipCode: "78701",
      audienceSegment: "first_time_homebuyers",
      serviceAreas: ["Round Rock"],
      preferredCity: "Austin",
      preferredState: "TX",
      categories: ["dining", "neighborhoods"]
    });

    expect(result).toEqual({
      dining: ["Spot A"],
      neighborhoods: ["Spot B"]
    });
    expect(mockGetCachedPerplexityCategoryPayload).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({
        category: "dining",
        serviceAreas: ["Round Rock"]
      })
    );
    expect(mockGetCachedPerplexityCategoryPayload).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({ category: "neighborhoods", serviceAreas: null })
    );
  });
});
