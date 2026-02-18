import { act, renderHook, waitFor } from "@testing-library/react";
import { useLocationAutocomplete } from "@web/src/components/location/domain/hooks/useLocationAutocomplete";

jest.mock("@web/src/lib/logger", () => ({
  logger: {},
  createChildLogger: () => ({
    error: jest.fn(),
    warn: jest.fn(),
    info: jest.fn(),
    debug: jest.fn()
  })
}));

jest.mock("@web/src/components/location/domain/hooks/useGooglePlacesServices", () => ({
  useGooglePlacesServices: jest.fn()
}));

jest.mock("@web/src/components/location/domain/locationMappers", () => ({
  formatLocationDisplay: jest.fn((location) =>
    location?.postalCode
      ? `${location.city}, ${location.state} ${location.postalCode}`
      : `${location.city}, ${location.state}`
  ),
  isPostalCodeInput: jest.fn((value: string) => /^\d{5}(-\d{4})?$/.test(value))
}));

jest.mock("@web/src/components/location/domain/locationResolutionService", () => ({
  resolveGeoFallback: jest.fn(),
  resolveServiceAreasFromDataset: jest.fn(),
  resolveZipFromDataset: jest.fn(),
  buildFallbackServiceAreas: jest.fn(),
  buildLocationDataFromPlace: jest.fn()
}));

const { useGooglePlacesServices } = jest.requireMock(
  "@web/src/components/location/domain/hooks/useGooglePlacesServices"
);
const {
  resolveGeoFallback,
  resolveServiceAreasFromDataset,
  resolveZipFromDataset,
  buildFallbackServiceAreas,
  buildLocationDataFromPlace
} = jest.requireMock(
  "@web/src/components/location/domain/locationResolutionService"
);

describe("useLocationAutocomplete", () => {
  let consoleErrorSpy: jest.SpyInstance;

  const flushAsyncUpdates = async () => {
    await Promise.resolve();
    await Promise.resolve();
  };

  beforeEach(() => {
    jest.useFakeTimers();
    jest.clearAllMocks();
    consoleErrorSpy = jest
      .spyOn(console, "error")
      .mockImplementation((...args: unknown[]) => {
        const firstArg = String(args[0] ?? "");
        if (firstArg.includes("not wrapped in act")) {
          return;
        }
      });
    Object.defineProperty(window, "google", {
      configurable: true,
      value: {
        maps: {
          places: {
            PlacesServiceStatus: {
              OK: "OK"
            }
          },
          GeocoderStatus: {
            OK: "OK"
          },
          Geocoder: function Geocoder() {
            return {
              geocode: jest.fn()
            };
          },
          LatLng: function LatLng(lat: number, lng: number) {
            return {
              lat: () => lat,
              lng: () => lng
            };
          }
        }
      }
    });
  });

  afterEach(async () => {
    await act(async () => {
      jest.runOnlyPendingTimers();
      await flushAsyncUpdates();
    });
    consoleErrorSpy.mockRestore();
    jest.useRealTimers();
  });

  it("fetches suggestions after debounce", async () => {
    const getPlacePredictions = jest.fn().mockResolvedValue({
      predictions: [
        {
          place_id: "p1",
          structured_formatting: {
            main_text: "Seattle",
            secondary_text: "WA"
          }
        }
      ]
    });

    useGooglePlacesServices.mockReturnValue({
      isScriptLoaded: true,
      autocompleteService: { current: { getPlacePredictions } },
      placesService: { current: null }
    });

    const onChange = jest.fn();
    const { result } = renderHook(() =>
      useLocationAutocomplete({
        value: null,
        onChange,
        apiKey: "test-key",
        initialValue: undefined,
        autoFillFromGeolocation: false
      })
    );

    await act(async () => {
      result.current.handleInputChange("Seattle");
      jest.advanceTimersByTime(350);
      await flushAsyncUpdates();
    });

    await waitFor(() => {
      expect(getPlacePredictions).toHaveBeenCalledWith({
        input: "Seattle",
        types: ["(regions)"],
        componentRestrictions: { country: "us" }
      });
    });

    expect(result.current.shouldShowSuggestions).toBe(true);
  });

  it("sets validation error when postal code cannot be resolved", async () => {
    const getDetails = jest.fn(
      (
        _request: unknown,
        callback: (place: unknown, status: string) => void
      ) => {
        callback(
          {
            address_components: [],
            place_id: "place-1",
            formatted_address: "Seattle, WA",
            geometry: {
              location: {
                lat: () => 47.6062,
                lng: () => -122.3321
              }
            }
          },
          "OK"
        );
      }
    );

    useGooglePlacesServices.mockReturnValue({
      isScriptLoaded: true,
      autocompleteService: { current: { getPlacePredictions: jest.fn() } },
      placesService: { current: { getDetails } }
    });

    buildLocationDataFromPlace.mockReturnValue({
      city: "Seattle",
      state: "WA",
      country: "United States",
      placeId: "place-1",
      formattedAddress: "Seattle, WA"
    });
    resolveServiceAreasFromDataset.mockResolvedValue({
      county: "King",
      serviceAreas: ["Seattle"]
    });
    resolveGeoFallback.mockResolvedValue({ county: "King", serviceAreas: [] });
    buildFallbackServiceAreas.mockReturnValue(["Seattle"]);
    resolveZipFromDataset.mockResolvedValue("");

    const onChange = jest.fn();
    const { result } = renderHook(() =>
      useLocationAutocomplete({
        value: null,
        onChange,
        apiKey: "test-key",
        initialValue: undefined,
        autoFillFromGeolocation: false
      })
    );

    await act(async () => {
      result.current.handleSelectSuggestion({ place_id: "p1" } as never);
      await flushAsyncUpdates();
    });

    await waitFor(() => {
      expect(result.current.validationError).toBe(
        "Please include a ZIP code to continue."
      );
      expect(onChange).toHaveBeenCalledWith(null);
    });
  });

  it("applies selected place and resolves postal/service areas", async () => {
    const getDetails = jest.fn(
      (
        _request: unknown,
        callback: (place: unknown, status: string) => void
      ) => {
        callback(
          {
            address_components: [],
            place_id: "place-1",
            formatted_address: "Seattle, WA",
            geometry: {
              location: {
                lat: () => 47.6062,
                lng: () => -122.3321
              }
            }
          },
          "OK"
        );
      }
    );

    useGooglePlacesServices.mockReturnValue({
      isScriptLoaded: true,
      autocompleteService: { current: { getPlacePredictions: jest.fn() } },
      placesService: { current: { getDetails } }
    });

    buildLocationDataFromPlace.mockReturnValue({
      city: "Seattle",
      state: "WA",
      country: "United States",
      placeId: "place-1",
      formattedAddress: "Seattle, WA"
    });
    resolveServiceAreasFromDataset.mockResolvedValue({
      county: "King",
      serviceAreas: ["Seattle"]
    });
    resolveGeoFallback.mockResolvedValue({ county: "King", serviceAreas: [] });
    buildFallbackServiceAreas.mockReturnValue(["Seattle"]);
    resolveZipFromDataset.mockResolvedValue("98101");

    const onChange = jest.fn();
    const { result } = renderHook(() =>
      useLocationAutocomplete({
        value: null,
        onChange,
        apiKey: "test-key",
        initialValue: undefined,
        autoFillFromGeolocation: false
      })
    );

    await act(async () => {
      result.current.handleSelectSuggestion({ place_id: "p1" } as never);
      await flushAsyncUpdates();
    });

    await waitFor(() => {
      expect(onChange).toHaveBeenCalledWith(
        expect.objectContaining({
          city: "Seattle",
          postalCode: "98101",
          county: "King",
          serviceAreas: ["Seattle"]
        })
      );
    });
  });

  it("resolves ZIP entry on blur when input is postal code", async () => {
    const geocode = jest.fn(
      (
        _request: unknown,
        callback: (results: unknown[], status: string) => void
      ) => {
        callback(
          [
            {
              address_components: [],
              place_id: "zip-place",
              formatted_address: "Seattle, WA 98101",
              geometry: {
                location: {
                  lat: () => 47.6062,
                  lng: () => -122.3321
                }
              }
            }
          ],
          "OK"
        );
      }
    );

    Object.defineProperty(window, "google", {
      configurable: true,
      value: {
        maps: {
          places: {
            PlacesServiceStatus: {
              OK: "OK"
            }
          },
          GeocoderStatus: {
            OK: "OK"
          },
          Geocoder: function Geocoder() {
            return {
              geocode
            };
          }
        }
      }
    });

    useGooglePlacesServices.mockReturnValue({
      isScriptLoaded: true,
      autocompleteService: { current: { getPlacePredictions: jest.fn() } },
      placesService: { current: null }
    });

    buildLocationDataFromPlace.mockReturnValue({
      city: "Seattle",
      state: "WA",
      country: "United States",
      postalCode: "98101",
      placeId: "zip-place",
      formattedAddress: "Seattle, WA 98101"
    });
    resolveServiceAreasFromDataset.mockResolvedValue({
      county: "King",
      serviceAreas: ["Seattle"]
    });
    resolveGeoFallback.mockResolvedValue({ county: "King", serviceAreas: [] });
    buildFallbackServiceAreas.mockReturnValue(["Seattle"]);

    const onChange = jest.fn();
    const { result } = renderHook(() =>
      useLocationAutocomplete({
        value: null,
        onChange,
        apiKey: "test-key",
        initialValue: undefined,
        autoFillFromGeolocation: false
      })
    );

    act(() => {
      result.current.handleInputChange("98101");
    });

    act(() => {
      result.current.handleBlur();
      jest.advanceTimersByTime(200);
    });

    await waitFor(() => {
      expect(geocode).toHaveBeenCalled();
    });

    await act(async () => {
      await flushAsyncUpdates();
    });
  });

  it("autofills using geolocation when enabled", async () => {
    const geocode = jest.fn(
      (
        _request: unknown,
        callback: (results: unknown[], status: string) => void
      ) => {
        callback(
          [
            {
              address_components: [],
              place_id: "geo-place",
              formatted_address: "Seattle, WA",
              geometry: {
                location: {
                  lat: () => 47.6062,
                  lng: () => -122.3321
                }
              }
            }
          ],
          "OK"
        );
      }
    );

    const getCurrentPosition = jest.fn((success: (position: any) => void) => {
      success({
        coords: {
          latitude: 47.6062,
          longitude: -122.3321
        }
      });
    });

    Object.defineProperty(global.navigator, "geolocation", {
      configurable: true,
      value: {
        getCurrentPosition
      }
    });

    Object.defineProperty(window, "google", {
      configurable: true,
      value: {
        maps: {
          places: {
            PlacesServiceStatus: {
              OK: "OK"
            }
          },
          GeocoderStatus: {
            OK: "OK"
          },
          Geocoder: function Geocoder() {
            return {
              geocode
            };
          },
          LatLng: function LatLng(lat: number, lng: number) {
            return {
              lat: () => lat,
              lng: () => lng
            };
          }
        }
      }
    });

    useGooglePlacesServices.mockReturnValue({
      isScriptLoaded: true,
      autocompleteService: { current: { getPlacePredictions: jest.fn() } },
      placesService: { current: null }
    });

    buildLocationDataFromPlace.mockReturnValue({
      city: "Seattle",
      state: "WA",
      country: "United States",
      placeId: "geo-place",
      formattedAddress: "Seattle, WA"
    });
    resolveServiceAreasFromDataset.mockResolvedValue({
      county: "King",
      serviceAreas: ["Seattle"]
    });
    resolveGeoFallback.mockResolvedValue({ county: "King", serviceAreas: [] });
    buildFallbackServiceAreas.mockReturnValue(["Seattle"]);
    resolveZipFromDataset.mockResolvedValue("98101");

    const onChange = jest.fn();
    renderHook(() =>
      useLocationAutocomplete({
        value: null,
        onChange,
        apiKey: "test-key",
        initialValue: undefined,
        autoFillFromGeolocation: true
      })
    );

    await waitFor(() => {
      expect(getCurrentPosition).toHaveBeenCalled();
    });

    await act(async () => {
      await flushAsyncUpdates();
    });
  });
});
