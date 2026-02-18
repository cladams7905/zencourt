jest.mock("@web/src/lib/core/logging/logger", () => ({
  logger: {},
  createChildLogger: jest.fn(() => ({ warn: jest.fn(), info: jest.fn() }))
}));

jest.mock(
  "@web/src/server/services/communityData/providers/google/transport/client",
  () => ({
    fetchPlaceDetails: jest.fn()
  })
);

jest.mock(
  "@web/src/server/services/communityData/providers/google/cache",
  () => {
    const cacheObj = {
      getCachedPlaceDetails: jest.fn().mockResolvedValue(null),
      setCachedPlaceDetails: jest.fn().mockResolvedValue(undefined)
    };
    return {
      createCommunityCache: jest.fn(() => cacheObj),
      __cacheObj: cacheObj
    };
  }
);

jest.mock(
  "@web/src/server/services/communityData/providers/google/core/geo",
  () => ({
    DistanceCache: class {
      constructor(
        public lat: number,
        public lng: number
      ) {}
    },
    ServiceAreaDistanceCache: class {
      constructor(public centers: unknown[]) {}
    },
    loadCityDataset: jest.fn(),
    resolveServiceAreaCenters: jest.fn(),
    resolveZipLocation: jest.fn()
  })
);

import {
  getQueryOverrides,
  toOriginLocationInput,
  resolveLocationOrWarn,
  getPlaceDetailsCached,
  buildGeoRuntimeContext,
  communityCache
} from "@web/src/server/services/communityData/providers/google/pipeline/shared";

describe("google pipeline shared", () => {
  const geoMock = jest.requireMock(
    "@web/src/server/services/communityData/providers/google/core/geo"
  );
  const transportMock = jest.requireMock(
    "@web/src/server/services/communityData/providers/google/transport/client"
  );

  beforeEach(() => {
    geoMock.loadCityDataset.mockReset();
    geoMock.resolveServiceAreaCenters.mockReset();
    geoMock.resolveZipLocation.mockReset();
    transportMock.fetchPlaceDetails.mockReset();
    (communityCache.getCachedPlaceDetails as jest.Mock).mockReset();
    (communityCache.setCachedPlaceDetails as jest.Mock).mockReset();

    (communityCache.getCachedPlaceDetails as jest.Mock).mockResolvedValue(null);
    (communityCache.setCachedPlaceDetails as jest.Mock).mockResolvedValue(
      undefined
    );
  });

  it("returns query overrides for education libraries", () => {
    expect(getQueryOverrides("education", "best library")).toEqual({
      minReviews: 10
    });
    expect(getQueryOverrides("dining", "cafes")).toBeNull();
  });

  it("converts origin location input", () => {
    expect(
      toOriginLocationInput({ city: "Austin", state_id: "TX", lat: 1, lng: 2 })
    ).toEqual({ city: "Austin", state: "TX", lat: 1, lng: 2 });
  });

  it("warns and returns null when location cannot be resolved", async () => {
    geoMock.resolveZipLocation.mockResolvedValueOnce(null);
    await expect(resolveLocationOrWarn("78701")).resolves.toBeNull();
  });

  it("reads and caches place details", async () => {
    transportMock.fetchPlaceDetails.mockResolvedValueOnce({ id: "p1" });

    const value = await getPlaceDetailsCached("p1");
    expect(value).toEqual({ id: "p1" });
    expect(communityCache.setCachedPlaceDetails).toHaveBeenCalledWith("p1", {
      id: "p1"
    });
  });

  it("builds geo runtime context", async () => {
    geoMock.loadCityDataset.mockResolvedValueOnce([
      { city: "Austin", state_id: "TX" }
    ]);
    geoMock.resolveServiceAreaCenters.mockReturnValueOnce([{ city: "Austin" }]);

    const result = await buildGeoRuntimeContext(
      "78701",
      {
        city: "Austin",
        state_id: "TX",
        county_name: "Travis",
        lat: 1,
        lng: 2,
        population: 1000,
        zips: "78701"
      },
      ["Austin,TX"]
    );

    expect(result.distanceCache).toBeDefined();
    expect(result.serviceAreaCache).toBeDefined();
  });
});
