const mockBuildAudienceAugmentDelta = jest.fn();
const mockApplyAudienceDelta = jest.fn();
const mockGetAudienceSkipCategories = jest.fn();
const mockTrimCommunityDataLists = jest.fn();
const mockNormalizeAudienceSegment = jest.fn();
const mockGetCommunityDataByZip = jest.fn();
const mockResolveLocationOrWarn = jest.fn();
const mockBuildGeoRuntimeContext = jest.fn();
const mockGetCachedAudienceDelta = jest.fn();
const mockSetCachedAudienceDelta = jest.fn();
const mockGetCachedCityDescription = jest.fn();
const mockSetCachedCityDescription = jest.fn();

jest.mock(
  "@web/src/server/services/communityData/providers/google/core/audience",
  () => ({
    buildAudienceAugmentDelta: (...args: unknown[]) =>
      mockBuildAudienceAugmentDelta(...args)
  })
);

jest.mock(
  "@web/src/server/services/communityData/providers/google/core/communityLists",
  () => ({
    applyAudienceDelta: (...args: unknown[]) => mockApplyAudienceDelta(...args),
    getAudienceSkipCategories: (...args: unknown[]) =>
      mockGetAudienceSkipCategories(...args),
    trimCommunityDataLists: (...args: unknown[]) =>
      mockTrimCommunityDataLists(...args)
  })
);

jest.mock("@web/src/server/services/communityData/shared/audience", () => ({
  normalizeAudienceSegment: (...args: unknown[]) =>
    mockNormalizeAudienceSegment(...args)
}));

jest.mock("@web/src/server/services/communityData/config", () => ({
  SEARCH_ANCHOR_OFFSETS: [{ lat: 0, lng: 0 }]
}));

jest.mock(
  "@web/src/server/services/communityData/providers/google/pipeline/service",
  () => ({
    getCommunityDataByZip: (...args: unknown[]) =>
      mockGetCommunityDataByZip(...args)
  })
);

jest.mock(
  "@web/src/server/services/communityData/providers/google/pipeline/shared",
  () => ({
    resolveLocationOrWarn: (...args: unknown[]) =>
      mockResolveLocationOrWarn(...args),
    buildGeoRuntimeContext: (...args: unknown[]) =>
      mockBuildGeoRuntimeContext(...args),
    communityCache: {
      getCachedAudienceDelta: (...args: unknown[]) =>
        mockGetCachedAudienceDelta(...args),
      setCachedAudienceDelta: (...args: unknown[]) =>
        mockSetCachedAudienceDelta(...args),
      getCachedCityDescription: (...args: unknown[]) =>
        mockGetCachedCityDescription(...args),
      setCachedCityDescription: (...args: unknown[]) =>
        mockSetCachedCityDescription(...args)
    },
    getPlaceDetailsCached: jest.fn(),
    getQueryOverrides: jest.fn(),
    logger: {}
  })
);

import {
  getCommunityDataByZipAndAudience,
  buildAudienceCommunityData
} from "@web/src/server/services/communityData/providers/google/pipeline/audience";

describe("google audience pipeline", () => {
  beforeEach(() => {
    mockBuildAudienceAugmentDelta.mockReset();
    mockApplyAudienceDelta.mockReset();
    mockGetAudienceSkipCategories.mockReset();
    mockTrimCommunityDataLists.mockReset();
    mockNormalizeAudienceSegment.mockReset();
    mockGetCommunityDataByZip.mockReset();
    mockResolveLocationOrWarn.mockReset();
    mockBuildGeoRuntimeContext.mockReset();
    mockGetCachedAudienceDelta.mockReset();
    mockSetCachedAudienceDelta.mockReset();
    mockGetCachedCityDescription.mockReset();
    mockSetCachedCityDescription.mockReset();

    mockNormalizeAudienceSegment.mockReturnValue("growing_families");
    mockGetAudienceSkipCategories.mockReturnValue(new Set());
    mockGetCommunityDataByZip.mockResolvedValue({ neighborhoods_list: "- N" });
    mockTrimCommunityDataLists.mockImplementation((v: unknown) => v);
    mockResolveLocationOrWarn.mockResolvedValue({
      city: "Austin",
      state_id: "TX",
      lat: 1,
      lng: 2
    });
    mockBuildGeoRuntimeContext.mockResolvedValue({
      distanceCache: {},
      serviceAreaCache: null
    });
    mockBuildAudienceAugmentDelta.mockResolvedValue({ dining: "- D" });
    mockApplyAudienceDelta.mockReturnValue({ neighborhoods_list: "- N" });
  });

  it("falls back to base community fetch when audience is invalid", async () => {
    mockNormalizeAudienceSegment.mockReturnValueOnce(null);

    await getCommunityDataByZipAndAudience("78701", "invalid");
    expect(mockGetCommunityDataByZip).toHaveBeenCalledWith(
      "78701",
      undefined,
      undefined,
      undefined
    );
  });

  it("builds and caches audience delta on cache miss", async () => {
    mockGetCachedAudienceDelta.mockResolvedValueOnce(null);

    await getCommunityDataByZipAndAudience("78701", "families");
    expect(mockBuildAudienceAugmentDelta).toHaveBeenCalled();
    expect(mockSetCachedAudienceDelta).toHaveBeenCalled();
  });

  it("returns null when base community data is unavailable", async () => {
    mockGetCachedAudienceDelta.mockResolvedValueOnce({ dining: "- D" });
    mockGetCommunityDataByZip.mockResolvedValueOnce(null);

    await expect(
      getCommunityDataByZipAndAudience("78701", "families")
    ).resolves.toBeNull();
  });

  it("selects neighborhoods based on audience segment", () => {
    mockNormalizeAudienceSegment.mockReturnValue("luxury_homebuyers");
    const result = buildAudienceCommunityData(
      {
        neighborhoods_list: "- default",
        neighborhoods_family_list: "- family",
        neighborhoods_luxury_list: "- luxury",
        neighborhoods_senior_list: "- senior",
        neighborhoods_relocators_list: "- reloc",
        zip_code: "78701"
      } as never,
      "luxury_homebuyers"
    );

    expect(result.neighborhoods_list).toBe("- luxury");
  });

});
