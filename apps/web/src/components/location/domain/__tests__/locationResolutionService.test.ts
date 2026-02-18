import {
  buildFallbackServiceAreas,
  buildLocationDataFromPlace,
  resolveGeoFallback,
  resolveServiceAreasFromDataset,
  resolveZipFromDataset
} from "@web/src/components/location/domain/locationResolutionService";
import * as cityDataset from "@web/src/lib/domain/location/cityDataset";

jest.mock("@web/src/lib/domain/location/cityDataset", () => {
  const actual = jest.requireActual("@web/src/lib/domain/location/cityDataset");
  return {
    ...actual,
    loadCityDataset: jest.fn()
  };
});

const mockLoadCityDataset =
  cityDataset.loadCityDataset as jest.MockedFunction<
    typeof cityDataset.loadCityDataset
  >;

describe("locationResolutionService", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("resolves nearby service areas and county from dataset", async () => {
    mockLoadCityDataset.mockResolvedValue([
      {
        city: "Seattle",
        city_ascii: "Seattle",
        state_id: "WA",
        county_name: "King County",
        lat: 47.6062,
        lng: -122.3321,
        population: 700000,
        zips: "98101"
      },
      {
        city: "Bellevue",
        city_ascii: "Bellevue",
        state_id: "WA",
        county_name: "King County",
        lat: 47.6101,
        lng: -122.2015,
        population: 150000,
        zips: "98004"
      },
      {
        city: "Spokane",
        city_ascii: "Spokane",
        state_id: "WA",
        county_name: "Spokane County",
        lat: 47.6588,
        lng: -117.426,
        population: 220000,
        zips: "99201"
      }
    ]);

    const result = await resolveServiceAreasFromDataset({
      state: "WA",
      lat: 47.6062,
      lng: -122.3321
    });

    expect(result).toEqual({
      county: "King",
      serviceAreas: ["Seattle", "Bellevue"]
    });
  });

  it("returns null when no nearby candidate is within radius", async () => {
    mockLoadCityDataset.mockResolvedValue([
      {
        city: "Miami",
        city_ascii: "Miami",
        state_id: "FL",
        county_name: "Miami-Dade County",
        lat: 25.7617,
        lng: -80.1918,
        population: 400000,
        zips: "33101"
      }
    ]);

    const result = await resolveServiceAreasFromDataset({
      state: "WA",
      lat: 47.6062,
      lng: -122.3321
    });

    expect(result).toBeNull();
  });

  it("resolves zip by city and state using city_ascii fallback", async () => {
    mockLoadCityDataset.mockResolvedValue([
      {
        city: "San Jose",
        city_ascii: "San Jose",
        state_id: "CA",
        county_name: "Santa Clara County",
        lat: 37.3382,
        lng: -121.8863,
        population: 1000000,
        zips: "95110 95111"
      }
    ]);

    const zip = await resolveZipFromDataset("san jose", "ca");
    expect(zip).toBe("95110");
  });

  it("builds fallback service areas by precedence", () => {
    expect(
      buildFallbackServiceAreas(
        { county: "King", serviceAreas: ["Seattle"] },
        { county: "Pierce", serviceAreas: ["Tacoma"] }
      )
    ).toEqual(["Seattle"]);

    expect(
      buildFallbackServiceAreas(null, {
        county: "Pierce",
        serviceAreas: ["Tacoma"]
      })
    ).toEqual(["Tacoma"]);

    expect(
      buildFallbackServiceAreas(null, {
        county: "Pierce",
        serviceAreas: []
      })
    ).toEqual(["Pierce"]);
  });

  it("maps place fields into LocationData", () => {
    const result = buildLocationDataFromPlace({
      addressComponents: [
        {
          long_name: "Austin",
          short_name: "Austin",
          types: ["locality"]
        } as google.maps.GeocoderAddressComponent,
        {
          long_name: "Texas",
          short_name: "TX",
          types: ["administrative_area_level_1"]
        } as google.maps.GeocoderAddressComponent,
        {
          long_name: "United States",
          short_name: "US",
          types: ["country"]
        } as google.maps.GeocoderAddressComponent
      ],
      placeId: "place-1",
      formattedAddress: "Austin, TX"
    });

    expect(result).toMatchObject({
      city: "Austin",
      state: "TX",
      country: "United States",
      placeId: "place-1",
      formattedAddress: "Austin, TX"
    });
  });

  it("resolves geo fallback county and service areas from geocoder results", async () => {
    const geocode = jest.fn((_: unknown, cb: (results: unknown[], status: string) => void) => {
      cb(
        [
          {
            address_components: [
              {
                long_name: "King County",
                short_name: "King County",
                types: ["administrative_area_level_2"]
              },
              {
                long_name: "Seattle",
                short_name: "Seattle",
                types: ["locality"]
              }
            ]
          }
        ],
        "OK"
      );
    });

    Object.defineProperty(window, "google", {
      configurable: true,
      value: {
        maps: {
          Geocoder: function Geocoder() {
            return { geocode };
          },
          GeocoderStatus: {
            OK: "OK"
          }
        }
      }
    });

    const location = { lat: () => 0, lng: () => 0 } as google.maps.LatLng;
    const result = await resolveGeoFallback(location);

    expect(result).toEqual({
      county: "King",
      serviceAreas: ["Seattle"]
    });
  });
});
