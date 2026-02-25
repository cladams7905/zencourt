const mockFetchPlaces = jest.fn();

jest.mock(
  "@web/src/server/services/communityData/providers/google/transport/client",
  () => ({
    fetchPlaces: (...args: unknown[]) => mockFetchPlaces(...args)
  })
);

jest.mock("@web/src/server/services/_config/community", () => ({
  CHAIN_FILTER_CATEGORIES: ["dining", "coffee_brunch"],
  CHAIN_NAME_BLACKLIST: ["starbucks"],
  DEFAULT_SEARCH_RADIUS_METERS: 1000,
  MAX_PLACE_DISTANCE_KM: 50,
  NEIGHBORHOOD_REJECT_TERMS: ["district"],
  getCategoryMinRating: jest.fn(() => 4),
  getCategoryMinReviews: jest.fn(() => 10)
}));

jest.mock(
  "@web/src/server/services/communityData/providers/google/core/seasonal",
  () => ({
    LOW_PRIORITY_ANCHOR_CATEGORIES: new Set(["education"]),
    normalizeQueryKey: (q: string) => q.toLowerCase().trim()
  })
);

import {
  getSearchAnchors,
  fetchPlacesWithAnchors,
  toScoredPlaces,
  fetchScoredPlacesForQueries
} from "@web/src/server/services/communityData/providers/google/core/search";

describe("google search", () => {
  beforeEach(() => {
    mockFetchPlaces.mockReset();
  });

  it("dedupes search anchors and falls back to origin", () => {
    const anchors = getSearchAnchors({ lat: 1, lng: 2 } as never, [
      { lat: 0, lng: 0 },
      { lat: 0, lng: 0 }
    ]);
    expect(anchors).toHaveLength(1);
  });

  it("falls back to origin when anchor offsets are empty", () => {
    const anchors = getSearchAnchors({ lat: 1, lng: 2 } as never, []);
    expect(anchors).toEqual([{ lat: 1, lng: 2 }]);
  });

  it("fetches places with single anchor for low-priority category", async () => {
    mockFetchPlaces.mockResolvedValue([{ id: "p1" }]);

    await fetchPlacesWithAnchors(
      "libraries",
      { lat: 1, lng: 2 } as never,
      4,
      [
        { lat: 0.1, lng: 0.1 },
        { lat: 0.2, lng: 0.2 }
      ],
      "education" as never
    );

    expect(mockFetchPlaces).toHaveBeenCalledTimes(1);
  });

  it("forces single anchor when requested", async () => {
    mockFetchPlaces.mockResolvedValue([{ id: "p1" }]);

    await fetchPlacesWithAnchors(
      "cafes",
      { lat: 1, lng: 2 } as never,
      4,
      [
        { lat: 0.1, lng: 0.1 },
        { lat: 0.2, lng: 0.2 }
      ],
      "dining" as never,
      true
    );

    expect(mockFetchPlaces).toHaveBeenCalledTimes(1);
  });

  it("filters and scores places", () => {
    const distanceCache = {
      getDistanceKm: jest.fn().mockReturnValue(2)
    } as never;

    const result = toScoredPlaces(
      [
        {
          displayName: { text: "Cafe Blue" },
          rating: 4.6,
          userRatingCount: 30,
          formattedAddress: "Main",
          id: "p1",
          location: { latitude: 1, longitude: 2 }
        },
        {
          displayName: { text: "Starbucks Downtown" },
          rating: 5,
          userRatingCount: 100,
          formattedAddress: "Main",
          id: "p2",
          location: { latitude: 1, longitude: 2 }
        }
      ] as never,
      "dining",
      distanceCache
    );

    expect(result).toHaveLength(1);
    expect(result[0].name).toBe("Cafe Blue");
  });

  it("applies neighborhood reject terms and service-area distance", () => {
    const distanceCache = {
      getDistanceKm: jest.fn().mockReturnValue(2)
    } as never;
    const serviceAreaCache = {
      getDistanceKm: jest.fn().mockReturnValue(3)
    } as never;

    const result = toScoredPlaces(
      [
        {
          displayName: { text: "Warehouse District" },
          rating: 4.6,
          userRatingCount: 30,
          formattedAddress: "Main",
          id: "p1",
          location: { latitude: 1, longitude: 2 }
        },
        {
          displayName: { text: "Hyde Park" },
          rating: 4.6,
          userRatingCount: 30,
          formattedAddress: "Main",
          id: "p2",
          location: { latitude: 1, longitude: 2 }
        }
      ] as never,
      "neighborhoods_general",
      distanceCache,
      serviceAreaCache
    );

    expect(result).toHaveLength(1);
    expect(result[0].name).toBe("Hyde Park");
    expect(result[0].distanceKm).toBe(2);
  });

  it("returns empty array for missing query list", async () => {
    await expect(
      fetchScoredPlacesForQueries({
        queries: [],
        category: "dining",
        maxResults: 3,
        location: { lat: 1, lng: 2 } as never,
        distanceCache: { getDistanceKm: jest.fn().mockReturnValue(2) } as never,
        anchorOffsets: [{ lat: 0, lng: 0 }],
        seasonalQueries: new Set()
      })
    ).resolves.toEqual([]);
  });

  it("fetches scored places for each query", async () => {
    mockFetchPlaces.mockResolvedValue([
      {
        displayName: { text: "Cafe Blue" },
        rating: 4.6,
        userRatingCount: 30,
        formattedAddress: "Main",
        id: "p1",
        location: { latitude: 1, longitude: 2 }
      }
    ]);

    const results = await fetchScoredPlacesForQueries({
      queries: ["Q1", "Q2"],
      category: "dining",
      maxResults: 3,
      location: { lat: 1, lng: 2 } as never,
      distanceCache: { getDistanceKm: jest.fn().mockReturnValue(2) } as never,
      anchorOffsets: [{ lat: 0, lng: 0 }],
      seasonalQueries: new Set(["q1"]),
      overridesForQuery: () => ({ minRating: 3 })
    });

    expect(results.length).toBeGreaterThan(0);
    expect(mockFetchPlaces).toHaveBeenCalledTimes(2);
  });
});
