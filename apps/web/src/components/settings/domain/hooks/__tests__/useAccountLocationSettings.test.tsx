import { act, renderHook } from "@testing-library/react";
import type { LocationData } from "@web/src/components/location";
import { useAccountLocationSettings } from "@web/src/components/settings/domain/hooks/useAccountLocationSettings";

const mockToastSuccess = jest.fn();
const mockToastError = jest.fn();
const mockUpdateUserLocation = jest.fn();
const mockFormatLocationForStorage = jest.fn();
const mockNormalizeCountyName = jest.fn();

jest.mock("sonner", () => ({
  toast: {
    success: (...args: unknown[]) => mockToastSuccess(...args),
    error: (...args: unknown[]) => mockToastError(...args)
  }
}));

jest.mock("@web/src/server/models/userAdditional", () => ({
  updateUserLocation: (...args: unknown[]) => mockUpdateUserLocation(...args)
}));

jest.mock("@web/src/lib/domain/location/cityDataset", () => ({
  normalizeCountyName: (...args: unknown[]) => mockNormalizeCountyName(...args)
}));

jest.mock("@web/src/lib/domain/location/formatters", () => ({
  formatLocationForStorage: (...args: unknown[]) =>
    mockFormatLocationForStorage(...args)
}));

describe("useAccountLocationSettings", () => {
  const locationValue: LocationData = {
    city: "Austin",
    state: "TX",
    country: "United States",
    postalCode: "78701",
    county: "Travis County",
    serviceAreas: ["Austin", "Round Rock"],
    placeId: "p1",
    formattedAddress: "Austin, TX 78701"
  };

  beforeEach(() => {
    mockToastSuccess.mockReset();
    mockToastError.mockReset();
    mockUpdateUserLocation.mockReset();
    mockFormatLocationForStorage.mockReset();
    mockNormalizeCountyName.mockReset();
    mockFormatLocationForStorage.mockImplementation(
      (value: LocationData) => `${value.city}, ${value.state} ${value.postalCode}`
    );
    mockNormalizeCountyName.mockImplementation((value: string) => value.trim());
  });

  it("reports dirty state and exposes save callback registration", () => {
    const onDirtyChange = jest.fn();
    const onRegisterSave = jest.fn();

    const { result } = renderHook(() =>
      useAccountLocationSettings({
        userId: "u1",
        location: null,
        onDirtyChange,
        onRegisterSave
      })
    );

    expect(onRegisterSave).toHaveBeenCalledWith(expect.any(Function));
    expect(onDirtyChange).toHaveBeenCalledWith(false);

    act(() => {
      result.current.setLocationValue(locationValue);
    });

    expect(result.current.isLocationDirty).toBe(true);
    expect(onDirtyChange).toHaveBeenLastCalledWith(true);
  });

  it("saves formatted location with normalized county and custom service areas", async () => {
    mockUpdateUserLocation.mockResolvedValue({});

    const { result } = renderHook(() =>
      useAccountLocationSettings({
        userId: "u1",
        location: null
      })
    );

    act(() => {
      result.current.setLocationValue(locationValue);
    });
    act(() => {
      result.current.setCountyOverride(" Travis ");
      result.current.setServiceAreasOverride("Austin,  Cedar Park ");
    });

    await act(async () => {
      await result.current.handleSaveLocation();
    });

    expect(mockUpdateUserLocation).toHaveBeenCalledWith(
      "u1",
      "Austin, TX 78701",
      {
        county: "Travis",
        serviceAreas: ["Austin", "Cedar Park"]
      }
    );
    expect(mockToastSuccess).toHaveBeenCalledWith("Location updated.");
    expect(result.current.savedLocation).toBe("Austin, TX 78701");
  });

  it("does nothing when save is triggered without location value", async () => {
    const { result } = renderHook(() =>
      useAccountLocationSettings({
        userId: "u1",
        location: null
      })
    );

    await act(async () => {
      await result.current.handleSaveLocation();
    });

    expect(mockUpdateUserLocation).not.toHaveBeenCalled();
  });

  it("surfaces save failure", async () => {
    mockUpdateUserLocation.mockRejectedValue(new Error("save failed"));

    const { result } = renderHook(() =>
      useAccountLocationSettings({
        userId: "u1",
        location: null
      })
    );

    act(() => {
      result.current.setLocationValue(locationValue);
    });

    await act(async () => {
      await result.current.handleSaveLocation();
    });

    expect(mockToastError).toHaveBeenCalledWith("save failed");
    expect(result.current.isSavingLocation).toBe(false);
  });
});
