import { act, renderHook, waitFor } from "@testing-library/react";
import { toast } from "sonner";
import { useAddressAutocomplete } from "@web/src/components/location/domain/hooks/useAddressAutocomplete";

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

jest.mock("sonner", () => ({
  toast: {
    error: jest.fn()
  }
}));

const { useGooglePlacesServices } = jest.requireMock(
  "@web/src/components/location/domain/hooks/useGooglePlacesServices"
);

describe("useAddressAutocomplete", () => {
  const flushAsyncUpdates = async () => {
    await Promise.resolve();
    await Promise.resolve();
  };

  beforeEach(() => {
    jest.useFakeTimers();
    jest.clearAllMocks();
    Object.defineProperty(window, "google", {
      configurable: true,
      value: {
        maps: {
          places: {
            PlacesServiceStatus: {
              OK: "OK"
            }
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
    jest.useRealTimers();
  });

  it("fetches address suggestions after debounce", async () => {
    const getPlacePredictions = jest.fn().mockResolvedValue({
      predictions: [
        {
          place_id: "p1",
          structured_formatting: {
            main_text: "123 Main St",
            secondary_text: "Seattle, WA"
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
      useAddressAutocomplete({
        value: "",
        onChange,
        apiKey: "key",
        country: "us"
      })
    );

    await act(async () => {
      result.current.handleInputChange("123 Main");
      jest.advanceTimersByTime(350);
      await flushAsyncUpdates();
    });

    await waitFor(() => {
      expect(getPlacePredictions).toHaveBeenCalledWith({
        input: "123 Main",
        types: ["address"],
        componentRestrictions: { country: "us" }
      });
    });

    expect(result.current.shouldShowSuggestions).toBe(true);
  });

  it("handles suggestion fetch failure", async () => {
    const getPlacePredictions = jest
      .fn()
      .mockRejectedValue(new Error("network down"));

    useGooglePlacesServices.mockReturnValue({
      isScriptLoaded: true,
      autocompleteService: { current: { getPlacePredictions } },
      placesService: { current: null }
    });

    const { result } = renderHook(() =>
      useAddressAutocomplete({
        value: "",
        onChange: jest.fn(),
        apiKey: "key",
        country: "us"
      })
    );

    await act(async () => {
      result.current.handleInputChange("123 Main");
      jest.advanceTimersByTime(350);
      await flushAsyncUpdates();
    });

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith(
        "Error fetching address suggestions."
      );
    });
  });

  it("falls back when places service is unavailable", () => {
    useGooglePlacesServices.mockReturnValue({
      isScriptLoaded: true,
      autocompleteService: { current: null },
      placesService: { current: null }
    });

    const onChange = jest.fn();
    const { result } = renderHook(() =>
      useAddressAutocomplete({
        value: "",
        onChange,
        apiKey: "key",
        country: "us"
      })
    );

    act(() => {
      result.current.handleSelectSuggestion({
        place_id: "p1",
        description: "123 Main St, Seattle, WA"
      } as never);
    });

    expect(onChange).toHaveBeenCalledWith("123 Main St, Seattle, WA");
    expect(result.current.shouldShowSuggestions).toBe(false);
  });

  it("uses place details and emits onSelectAddress", async () => {
    const getDetails = jest.fn(
      (
        _request: unknown,
        callback: (place: unknown, status: string) => void
      ) => {
        callback(
          {
            formatted_address: "123 Main St, Seattle, WA",
            place_id: "place-1",
            address_components: [{ long_name: "Seattle", types: ["locality"] }]
          },
          "OK"
        );
      }
    );

    useGooglePlacesServices.mockReturnValue({
      isScriptLoaded: true,
      autocompleteService: { current: null },
      placesService: { current: { getDetails } }
    });

    const onChange = jest.fn();
    const onSelectAddress = jest.fn();
    const { result } = renderHook(() =>
      useAddressAutocomplete({
        value: "",
        onChange,
        apiKey: "key",
        country: "us",
        onSelectAddress
      })
    );

    await act(async () => {
      result.current.handleSelectSuggestion({
        place_id: "p1",
        description: "123 Main St"
      } as never);
    });

    expect(onChange).toHaveBeenCalledWith("123 Main St, Seattle, WA");
    expect(onSelectAddress).toHaveBeenCalledWith(
      expect.objectContaining({
        formattedAddress: "123 Main St, Seattle, WA",
        placeId: "place-1"
      })
    );
  });

  it("clears input and suggestion state", () => {
    useGooglePlacesServices.mockReturnValue({
      isScriptLoaded: true,
      autocompleteService: { current: null },
      placesService: { current: null }
    });

    const onChange = jest.fn();
    const { result } = renderHook(() =>
      useAddressAutocomplete({
        value: "123 Main",
        onChange,
        apiKey: "key",
        country: "us"
      })
    );

    act(() => {
      result.current.handleClear();
    });

    expect(onChange).toHaveBeenCalledWith("");
    expect(result.current.inputValue).toBe("");
  });
});
