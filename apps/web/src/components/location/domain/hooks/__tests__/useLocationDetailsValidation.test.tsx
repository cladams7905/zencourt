import { renderHook, waitFor } from "@testing-library/react";
import { useLocationDetailsValidation } from "@web/src/components/location/domain/hooks/useLocationDetailsValidation";
import {
  getCityNameSetForState,
  getCountyNameSetForState
} from "@web/src/lib/locationHelpers";

jest.mock("@web/src/lib/locationHelpers", () => {
  const actual = jest.requireActual("@web/src/lib/locationHelpers");
  return {
    ...actual,
    getCityNameSetForState: jest.fn(),
    getCountyNameSetForState: jest.fn()
  };
});

const mockGetCityNameSetForState =
  getCityNameSetForState as jest.MockedFunction<typeof getCityNameSetForState>;
const mockGetCountyNameSetForState =
  getCountyNameSetForState as jest.MockedFunction<
    typeof getCountyNameSetForState
  >;

describe("useLocationDetailsValidation", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGetCityNameSetForState.mockResolvedValue(
      new Set(["seattle", "bellevue", "redmond"])
    );
    mockGetCountyNameSetForState.mockResolvedValue(new Set(["king"]));
  });

  it("reports no errors for valid county and service areas", async () => {
    const onValidationChange = jest.fn();

    const { result } = renderHook(() =>
      useLocationDetailsValidation({
        state: "WA",
        countyValue: "King County",
        serviceAreasValue: "Seattle, Bellevue",
        onValidationChange
      })
    );

    await waitFor(() => {
      expect(mockGetCityNameSetForState).toHaveBeenCalledWith("WA");
    });

    expect(result.current.hasErrors).toBe(false);
    expect(result.current.hasUnknownAreas).toBe(false);
    expect(onValidationChange).toHaveBeenLastCalledWith(false);
  });

  it("flags duplicate, too many, too long, invalid county, and unknown areas", async () => {
    const onValidationChange = jest.fn();

    const { result } = renderHook(() =>
      useLocationDetailsValidation({
        state: "WA",
        countyValue: "Wrong County",
        serviceAreasValue:
          "Seattle, Seattle, ThisAreaNameIsWayTooLongToBeAcceptedBecauseItExceedsFortyChars, Tacoma, Everett, Renton",
        onValidationChange
      })
    );

    await waitFor(() => {
      expect(result.current.hasUnknownAreas).toBe(true);
    });

    expect(result.current.hasDuplicates).toBe(true);
    expect(result.current.tooManyAreas).toBe(true);
    expect(result.current.tooLongAreas.length).toBeGreaterThan(0);
    expect(result.current.hasUnknownAreas).toBe(true);
    expect(onValidationChange).toHaveBeenLastCalledWith(true);
  });

  it("resets known sets when state is empty", async () => {
    const { result, rerender } = renderHook(
      (state: string) =>
        useLocationDetailsValidation({
          state,
          countyValue: "King",
          serviceAreasValue: "Seattle"
        }),
      {
        initialProps: "WA"
      }
    );

    await waitFor(() => {
      expect(result.current.hasErrors).toBe(false);
    });

    rerender("");

    await waitFor(() => {
      expect(result.current.hasErrors).toBe(false);
      expect(result.current.hasUnknownAreas).toBe(false);
    });
  });
});
