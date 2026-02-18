const mockBuildNeighborhoodDetailList = jest.fn();
const mockFormatPlaceList = jest.fn();
const mockBuildCategoryListWithDetails = jest.fn();
const mockBuildSeasonalQuerySections = jest.fn();
const mockGetCategoryDisplayLimit = jest.fn();
const mockGetPlaceDetailsCached = jest.fn();
const mockGetCachedSeasonalSections = jest.fn();
const mockSetCachedSeasonalSections = jest.fn();
const mockSetCachedCommunityCategoryList = jest.fn();

jest.mock(
  "@web/src/server/services/communityData/providers/google/core/places",
  () => ({
    buildNeighborhoodDetailList: (...args: unknown[]) =>
      mockBuildNeighborhoodDetailList(...args),
    formatPlaceList: (...args: unknown[]) => mockFormatPlaceList(...args)
  })
);

jest.mock(
  "@web/src/server/services/communityData/providers/google/core/places/details",
  () => ({
    buildCategoryListWithDetails: (...args: unknown[]) =>
      mockBuildCategoryListWithDetails(...args)
  })
);

jest.mock(
  "@web/src/server/services/communityData/providers/google/core/seasonal",
  () => ({
    buildSeasonalQuerySections: (...args: unknown[]) =>
      mockBuildSeasonalQuerySections(...args),
    CATEGORY_FIELD_MAP: {
      dining: "dining_list",
      community_events: "community_events_list"
    },
    NON_NEIGHBORHOOD_CATEGORY_KEYS: ["dining", "community_events"]
  })
);

jest.mock("@web/src/server/services/communityData/config", () => ({
  getCategoryDisplayLimit: (...args: unknown[]) =>
    mockGetCategoryDisplayLimit(...args)
}));

jest.mock(
  "@web/src/server/services/communityData/providers/google/pipeline/shared",
  () => ({
    getPlaceDetailsCached: (...args: unknown[]) =>
      mockGetPlaceDetailsCached(...args),
    communityCache: {
      getCachedSeasonalSections: (...args: unknown[]) =>
        mockGetCachedSeasonalSections(...args),
      setCachedSeasonalSections: (...args: unknown[]) =>
        mockSetCachedSeasonalSections(...args),
      setCachedCommunityCategoryList: (...args: unknown[]) =>
        mockSetCachedCommunityCategoryList(...args)
    }
  })
);

import {
  buildAndPersistCategoryListMap,
  getOrBuildSeasonalSections,
  getAndPersistNeighborhoodLists
} from "@web/src/server/services/communityData/providers/google/pipeline/workflows/assembly";

describe("google assembly workflow", () => {
  beforeEach(() => {
    mockBuildNeighborhoodDetailList.mockReset();
    mockFormatPlaceList.mockReset();
    mockBuildCategoryListWithDetails.mockReset();
    mockBuildSeasonalQuerySections.mockReset();
    mockGetCategoryDisplayLimit.mockReset();
    mockGetPlaceDetailsCached.mockReset();
    mockGetCachedSeasonalSections.mockReset();
    mockSetCachedSeasonalSections.mockReset();
    mockSetCachedCommunityCategoryList.mockReset();

    mockGetCategoryDisplayLimit.mockReturnValue(3);
    mockFormatPlaceList.mockReturnValue("- Formatted");
    mockBuildCategoryListWithDetails.mockResolvedValue("- Detailed");
    mockBuildNeighborhoodDetailList.mockReturnValue("- Neighborhood");
    mockBuildSeasonalQuerySections.mockReturnValue({ spring: "- S1" });
  });

  it("builds, maps, and caches category lists", async () => {
    const result = await buildAndPersistCategoryListMap({
      zipCode: "78701",
      grouped: { dining: [{ name: "Cafe" }] } as never,
      alreadyHydratedCategories: new Set(["dining"]),
      categoriesToFetch: new Set(["dining"] as never),
      cachedCategoryLists: new Map([["community_events", "- Cached"]] as never)
    });

    expect(result.get("dining_list")).toBe("- Formatted");
    expect(result.get("community_events_list")).toBe("- Cached");
    expect(mockSetCachedCommunityCategoryList).toHaveBeenCalled();
  });

  it("returns cached seasonal sections when present", async () => {
    mockGetCachedSeasonalSections.mockResolvedValueOnce({ summer: "- S" });

    await expect(
      getOrBuildSeasonalSections({ zipCode: "78701", grouped: {} })
    ).resolves.toEqual({ summer: "- S" });
    expect(mockSetCachedSeasonalSections).not.toHaveBeenCalled();
  });

  it("builds and caches seasonal sections on miss", async () => {
    mockGetCachedSeasonalSections.mockResolvedValueOnce(null);

    await expect(
      getOrBuildSeasonalSections({ zipCode: "78701", grouped: {} })
    ).resolves.toEqual({ spring: "- S1" });
    expect(mockSetCachedSeasonalSections).toHaveBeenCalled();
  });

  it("builds neighborhood lists and caches non-empty values", async () => {
    const result = await getAndPersistNeighborhoodLists({
      zipCode: "78701",
      grouped: {
        neighborhoods_general: [{ name: "A" }],
        neighborhoods_family: [{ name: "B" }],
        neighborhoods_senior: [{ name: "C" }]
      } as never,
      cachedNeighborhoodLists: new Map()
    });

    expect(result.neighborhoodsGeneral).toBe("- Neighborhood");
    expect(mockSetCachedCommunityCategoryList).toHaveBeenCalledTimes(3);
  });
});
