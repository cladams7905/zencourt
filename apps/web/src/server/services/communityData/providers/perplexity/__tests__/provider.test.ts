const mockNormalizeAudienceSegment = jest.fn();
const mockResolveLocationOrWarn = jest.fn();
const mockToOriginLocationInput = jest.fn();
const mockGetPerplexityCommunityData = jest.fn();
const mockGetCachedPerplexityCategoryPayload = jest.fn();
const mockShouldIncludeServiceAreasInCache = jest.fn();

jest.mock("@web/src/server/services/communityData/shared/audience", () => ({
  normalizeAudienceSegment: (...args: unknown[]) => mockNormalizeAudienceSegment(...args)
}));

jest.mock("@web/src/server/services/communityData/providers/google", () => ({
  resolveLocationOrWarn: (...args: unknown[]) => mockResolveLocationOrWarn(...args),
  toOriginLocationInput: (...args: unknown[]) => mockToOriginLocationInput(...args)
}));

jest.mock("../pipeline", () => ({
  getPerplexityCommunityData: (...args: unknown[]) => mockGetPerplexityCommunityData(...args),
  getPerplexityCommunityDataByZipAndAudienceForCategories: jest.fn(),
  getPerplexityMonthlyEventsSectionByZip: jest.fn(),
  prefetchPerplexityCategoriesByZip: jest.fn()
}));

jest.mock("../cache", () => ({
  getCachedPerplexityCategoryPayload: (...args: unknown[]) =>
    mockGetCachedPerplexityCategoryPayload(...args)
}));

jest.mock("@web/src/server/services/_config/community", () => {
  const actual = jest.requireActual("@web/src/server/services/_config/community");
  return {
    ...actual,
    shouldIncludeServiceAreasInCache: (...args: unknown[]) =>
      mockShouldIncludeServiceAreasInCache(...args)
  };
});

import { createPerplexityCommunityDataProvider } from "../provider";
import { CommunityDataProvider } from "@web/src/server/services/_config/community";

describe("perplexity community provider", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockNormalizeAudienceSegment.mockImplementation((value) => value ?? null);
    mockToOriginLocationInput.mockReturnValue({ city: "Austin", state: "TX" });
    mockShouldIncludeServiceAreasInCache.mockReturnValue(true);
  });

  it("returns undefined when location cannot be resolved", async () => {
    const provider = createPerplexityCommunityDataProvider();
    mockResolveLocationOrWarn.mockResolvedValueOnce(null);

    const result = await provider.getCommunityDataByZip({
      zipCode: "78701",
      serviceAreas: ["austin"]
    });

    expect(result).toBeUndefined();
    expect(mockGetPerplexityCommunityData).not.toHaveBeenCalled();
  });

  it("delegates getCommunityDataByZip with resolved origin location", async () => {
    const provider = createPerplexityCommunityDataProvider();
    mockResolveLocationOrWarn.mockResolvedValueOnce({ city: "Austin", state: "TX" });
    mockGetPerplexityCommunityData.mockResolvedValueOnce({ data: true });

    const result = await provider.getCommunityDataByZip({
      zipCode: "78701",
      serviceAreas: ["austin"]
    });

    expect(result).toEqual({ data: true });
    expect(mockGetPerplexityCommunityData).toHaveBeenCalledWith(
      expect.objectContaining({
        zipCode: "78701",
        location: { city: "Austin", state: "TX" },
        serviceAreas: ["austin"]
      })
    );
  });

  it("builds avoid recommendations from cached payloads", async () => {
    const provider = createPerplexityCommunityDataProvider();
    expect(provider.getAvoidRecommendationsForCategories).toBeDefined();
    mockNormalizeAudienceSegment.mockReturnValue("families");
    mockGetCachedPerplexityCategoryPayload
      .mockResolvedValueOnce({ items: [{ name: "Park" }, { name: "Park" }, { name: "Trail" }] })
      .mockResolvedValueOnce({ items: [{ name: "Cafe" }] });

    const result = await provider.getAvoidRecommendationsForCategories!({
      zipCode: "78701",
      categories: ["nature_outdoors", "coffee_brunch"],
      audienceSegment: "families",
      serviceAreas: ["austin"],
      preferredCity: "Austin",
      preferredState: "TX"
    });

    expect(result).toEqual({
      nature_outdoors: ["Park", "Trail"],
      coffee_brunch: ["Cafe"]
    });
  });

  it("exposes provider id", () => {
    const provider = createPerplexityCommunityDataProvider();
    expect(provider.provider).toBe(CommunityDataProvider.Perplexity);
  });
});
