const mockParseMarketLocation = jest.fn();
const mockGetMarketData = jest.fn();
const mockGetCommunityContentContext = jest.fn();
const mockSelectCommunityCategories = jest.fn();
const mockPeekNextCommunityCategories = jest.fn();

jest.mock(
  "@web/src/server/actions/content/generate/domain/marketLocation",
  () => ({
    parseMarketLocation: (...args: unknown[]) =>
      (mockParseMarketLocation as (...a: unknown[]) => unknown)(...args)
  })
);

jest.mock("@web/src/server/services/marketData", () => ({
  createMarketDataProviderRegistry: () => ({}),
  createMarketDataService: () => ({
    getMarketData: (...args: unknown[]) =>
      (mockGetMarketData as (...a: unknown[]) => unknown)(...args)
  })
}));

jest.mock("@web/src/server/services/communityData/service", () => ({
  getCommunityContentContext: (...args: unknown[]) =>
    (mockGetCommunityContentContext as (...a: unknown[]) => unknown)(...args)
}));

jest.mock("@web/src/server/services/contentRotation", () => ({
  COMMUNITY_CATEGORY_KEYS: ["neighborhoods_list", "dining_list"],
  getRecentHooksKey: () => "recent-hooks-key",
  RECENT_HOOKS_MAX: 50,
  selectCommunityCategories: (...args: unknown[]) =>
    (mockSelectCommunityCategories as (...a: unknown[]) => unknown)(...args),
  peekNextCommunityCategories: (...args: unknown[]) =>
    (mockPeekNextCommunityCategories as (...a: unknown[]) => unknown)(...args)
}));

jest.mock(
  "@web/src/server/services/communityData/providers/google/cache",
  () => ({
    createCommunityCache: () => ({
      getCachedCityDescription: () => Promise.resolve(null),
      setCachedCityDescription: () => Promise.resolve()
    })
  })
);

jest.mock("@web/src/server/services/ai", () => ({
  generateTextForUseCase: () => Promise.resolve(null),
  generateText: () => Promise.resolve(null)
}));

import { resolveContentContext } from "@web/src/server/actions/content/generate/context";
import {
  DomainValidationError,
  DomainDependencyError
} from "@web/src/server/errors/domain";

describe("contentGeneration context", () => {
  const baseBody = {
    category: "market_insights",
    audience_segments: [],
    agent_profile: {
      agent_name: "Agent",
      brokerage_name: "Brokerage",
      zip_code: "12345",
      city: "City",
      state: "ST",
      writing_tone_level: 3,
      writing_tone_label: "Conversational",
      writing_style_description: "Clear"
    }
  };

  const snapshot = {
    targetAudiences: null,
    location: null,
    writingToneLevel: null,
    writingStyleCustom: null,
    agentName: "",
    brokerageName: "",
    agentBio: null,
    audienceDescription: null,
    county: null,
    serviceAreas: null
  };

  const args = {
    body: baseBody,
    snapshot,
    userId: "user-1",
    redis: null,
    activeAudience: null as string | null
  };

  beforeEach(() => {
    mockParseMarketLocation.mockReset();
    mockGetMarketData.mockReset();
    mockGetCommunityContentContext.mockReset();
    mockSelectCommunityCategories.mockReset();
    mockPeekNextCommunityCategories.mockReset();
  });

  describe("resolveContentContext", () => {
    it("returns nulls for market/community when category is market_insights and location is missing", async () => {
      mockParseMarketLocation.mockReturnValue(null);

      await expect(
        resolveContentContext({
          ...args,
          body: { ...baseBody, category: "market_insights" }
        })
      ).rejects.toThrow(DomainValidationError);
      await expect(
        resolveContentContext({
          ...args,
          body: { ...baseBody, category: "market_insights" }
        })
      ).rejects.toThrow("Please add a valid US location");

      expect(mockGetMarketData).not.toHaveBeenCalled();
    });

    it("fetches market data and returns it when category is market_insights and location is valid", async () => {
      const location = { city: "Austin", state: "TX", zip_code: "78701" };
      mockParseMarketLocation.mockReturnValue(location);
      const marketData = { some: "data" };
      mockGetMarketData.mockResolvedValue(marketData);

      const result = await resolveContentContext({
        ...args,
        body: { ...baseBody, category: "market_insights" }
      });

      expect(mockGetMarketData).toHaveBeenCalledWith(location);
      expect(result.marketData).toEqual(marketData);
      expect(result.communityData).toBeNull();
      expect(result.cityDescription).toBeNull();
    });

    it("throws DomainDependencyError when market_insights but getMarketData returns null", async () => {
      mockParseMarketLocation.mockReturnValue({
        city: "Austin",
        state: "TX",
        zip_code: "78701"
      });
      mockGetMarketData.mockResolvedValue(null);

      await expect(
        resolveContentContext({
          ...args,
          body: { ...baseBody, category: "market_insights" }
        })
      ).rejects.toThrow(DomainDependencyError);
      await expect(
        resolveContentContext({
          ...args,
          body: { ...baseBody, category: "market_insights" }
        })
      ).rejects.toThrow("Market data is not configured");
    });

    it("fetches community context when category is community and location is valid", async () => {
      const location = { city: "Austin", state: "TX", zip_code: "78701" };
      mockParseMarketLocation.mockReturnValue(location);
      mockSelectCommunityCategories.mockResolvedValue({
        selected: ["neighborhoods_list"],
        shouldRefresh: false
      });
      mockPeekNextCommunityCategories.mockResolvedValue(["dining_list"]);
      const communityContext = {
        communityData: { seasonal_geo_sections: null },
        cityDescription: "Austin is great",
        communityCategoryKeys: ["neighborhoods_list"],
        seasonalExtraSections: null
      };
      mockGetCommunityContentContext.mockResolvedValue(communityContext);

      const result = await resolveContentContext({
        ...args,
        body: { ...baseBody, category: "community" },
        snapshot: {
          ...snapshot,
          location: "Austin, TX 78701",
          serviceAreas: []
        }
      });

      expect(mockSelectCommunityCategories).toHaveBeenCalled();
      expect(mockGetCommunityContentContext).toHaveBeenCalledWith(
        expect.objectContaining({
          category: "community",
          zipCode: "78701",
          preferredCity: "Austin",
          preferredState: "TX",
          selectedCommunityCategoryKeys: ["neighborhoods_list"],
          nextCommunityCategoryKeys: ["dining_list"]
        })
      );
      expect(result.communityData).toEqual(communityContext.communityData);
      // cityDescription comes from resolveCityDescription (cache + AI), mocked to return null
      expect(result.cityDescription).toBeNull();
      expect(result.communityCategoryKeys).toEqual(["neighborhoods_list"]);
    });

    it("returns nulls for community when category is neither community nor seasonal", async () => {
      mockParseMarketLocation.mockReturnValue(null);

      const result = await resolveContentContext({
        ...args,
        body: { ...baseBody, category: "educational" }
      });

      expect(mockGetCommunityContentContext).not.toHaveBeenCalled();
      expect(result.marketData).toBeNull();
      expect(result.communityData).toBeNull();
      expect(result.cityDescription).toBeNull();
      expect(result.communityCategoryKeys).toBeNull();
      expect(result.seasonalExtraSections).toBeNull();
    });
  });
});
