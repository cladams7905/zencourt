const mockFetchScoredPlacesForQueries = jest.fn();
const mockFetchPlacesWithAnchors = jest.fn();
const mockToScoredPlaces = jest.fn();
const mockGetPooledCategoryPlaces = jest.fn();
const mockHydratePlacesFromItems = jest.fn();
const mockGetQueryOverrides = jest.fn();

jest.mock(
  "@web/src/server/services/community/providers/google/core/search",
  () => ({
    fetchScoredPlacesForQueries: (...args: unknown[]) =>
      mockFetchScoredPlacesForQueries(...args),
    fetchPlacesWithAnchors: (...args: unknown[]) =>
      mockFetchPlacesWithAnchors(...args),
    toScoredPlaces: (...args: unknown[]) => mockToScoredPlaces(...args)
  })
);

jest.mock(
  "@web/src/server/services/community/providers/google/core/pools",
  () => ({
    getPooledCategoryPlaces: (...args: unknown[]) =>
      mockGetPooledCategoryPlaces(...args)
  })
);

jest.mock(
  "@web/src/server/services/community/providers/google/core/places/details",
  () => ({
    hydratePlacesFromItems: (...args: unknown[]) =>
      mockHydratePlacesFromItems(...args)
  })
);

jest.mock("@web/src/server/services/community/config", () => ({
  SEARCH_ANCHOR_OFFSETS: [{ lat: 0, lng: 0 }],
  NEIGHBORHOOD_QUERIES: []
}));

jest.mock(
  "@web/src/server/services/community/providers/google/pipeline/shared",
  () => ({
    communityCache: {},
    logger: {},
    getPlaceDetailsCached: jest.fn(),
    getQueryOverrides: (...args: unknown[]) => mockGetQueryOverrides(...args)
  })
);

import { fetchGroupedPlaces } from "@web/src/server/services/communityData/providers/google/pipeline/workflows/fetching";

describe("google fetching workflow", () => {
  beforeEach(() => {
    mockFetchScoredPlacesForQueries.mockReset();
    mockFetchPlacesWithAnchors.mockReset();
    mockToScoredPlaces.mockReset();
    mockGetPooledCategoryPlaces.mockReset();
    mockHydratePlacesFromItems.mockReset();
    mockGetQueryOverrides.mockReset();

    mockGetPooledCategoryPlaces.mockImplementation(
      async (
        _cache: unknown,
        _logger: unknown,
        _ctx: unknown,
        fetchFn: () => Promise<unknown>
      ) => {
        await fetchFn();
        return [{ placeId: "p1" }];
      }
    );
    mockHydratePlacesFromItems.mockResolvedValue([{ name: "Cafe" }]);
    mockFetchPlacesWithAnchors.mockResolvedValue([{ id: "n1" }]);
    mockToScoredPlaces.mockReturnValue([{ name: "Neighborhood" }]);
    mockFetchScoredPlacesForQueries.mockResolvedValue([{ name: "Cafe" }]);
  });

  it("fetches grouped category and neighborhood places", async () => {
    const result = await fetchGroupedPlaces({
      zipCode: "78701",
      location: {
        city: "Austin",
        state_id: "TX",
        county_name: "Travis",
        lat: 1,
        lng: 2,
        population: 1000,
        zips: "78701"
      },
      distanceCache: {} as never,
      serviceAreaCache: null,
      categoryQueries: [
        { key: "dining", queries: ["q1"], seasonalQueries: new Set(), max: 5 }
      ],
      neighborhoodsToFetch: [
        { key: "neighborhoods_general", query: "q", max: 3 }
      ] as never
    });

    expect(result.grouped.dining).toEqual([{ name: "Cafe" }]);
    expect(result.grouped.neighborhoods_general).toEqual([
      { name: "Neighborhood" }
    ]);
    expect(result.alreadyHydratedCategories.has("dining")).toBe(true);
    expect(mockFetchScoredPlacesForQueries).toHaveBeenCalled();
  });
});
