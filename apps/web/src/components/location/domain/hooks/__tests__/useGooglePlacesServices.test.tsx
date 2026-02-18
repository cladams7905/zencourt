import { act, renderHook, waitFor } from "@testing-library/react";
import { useGooglePlacesServices } from "@web/src/components/location/domain/hooks/useGooglePlacesServices";

describe("useGooglePlacesServices", () => {
  afterEach(() => {
    document.head.innerHTML = "";
  });

  it("initializes services when google places is already available", async () => {
    const autocompleteCtor = jest.fn(() => ({ mock: "autocomplete" }));
    const placesCtor = jest.fn(() => ({ mock: "places" }));

    Object.defineProperty(window, "google", {
      configurable: true,
      value: {
        maps: {
          places: {
            AutocompleteService: autocompleteCtor,
            PlacesService: placesCtor
          }
        }
      }
    });

    const { result } = renderHook(() => useGooglePlacesServices("test-key"));

    await waitFor(() => {
      expect(result.current.isScriptLoaded).toBe(true);
      expect(result.current.autocompleteService.current).toBeTruthy();
      expect(result.current.placesService.current).toBeTruthy();
    });

    expect(autocompleteCtor).toHaveBeenCalled();
    expect(placesCtor).toHaveBeenCalled();
  });

  it("adds script when google is unavailable and initializes on load", async () => {
    Object.defineProperty(window, "google", {
      configurable: true,
      value: undefined
    });

    const autocompleteCtor = jest.fn(() => ({ mock: "autocomplete" }));
    const placesCtor = jest.fn(() => ({ mock: "places" }));

    const { result } = renderHook(() => useGooglePlacesServices("abc123"));

    const script = document.getElementById(
      "zencourt-google-maps-places-script"
    ) as HTMLScriptElement;
    expect(script).toBeTruthy();
    expect(script.src).toContain("key=abc123");

    Object.defineProperty(window, "google", {
      configurable: true,
      value: {
        maps: {
          places: {
            AutocompleteService: autocompleteCtor,
            PlacesService: placesCtor
          }
        }
      }
    });

    await act(async () => {
      script.dispatchEvent(new Event("load"));
    });

    await waitFor(() => {
      expect(result.current.isScriptLoaded).toBe(true);
      expect(autocompleteCtor).toHaveBeenCalled();
      expect(placesCtor).toHaveBeenCalled();
    });
  });

  it("uses existing script element and listens for load", async () => {
    const existingScript = document.createElement("script");
    existingScript.id = "zencourt-google-maps-places-script";
    document.head.appendChild(existingScript);

    Object.defineProperty(window, "google", {
      configurable: true,
      value: undefined
    });

    const autocompleteCtor = jest.fn(() => ({ mock: "autocomplete" }));
    const placesCtor = jest.fn(() => ({ mock: "places" }));

    const { result } = renderHook(() => useGooglePlacesServices("test-key"));

    Object.defineProperty(window, "google", {
      configurable: true,
      value: {
        maps: {
          places: {
            AutocompleteService: autocompleteCtor,
            PlacesService: placesCtor
          }
        }
      }
    });

    await act(async () => {
      existingScript.dispatchEvent(new Event("load"));
    });

    await waitFor(() => {
      expect(result.current.isScriptLoaded).toBe(true);
      expect(autocompleteCtor).toHaveBeenCalled();
      expect(placesCtor).toHaveBeenCalled();
    });
  });
});
