import { act, renderHook } from "@testing-library/react";
import type { LocationData } from "@web/src/components/location";
import { useWelcomeSurveyState } from "@web/src/components/welcome/domain/hooks/useWelcomeSurveyState";

const mockNormalizeCountyName = jest.fn();
const mockToastError = jest.fn();
const mockLoggerError = jest.fn();

jest.mock("@web/src/lib/domain/location/cityDataset", () => ({
  normalizeCountyName: (...args: unknown[]) => mockNormalizeCountyName(...args)
}));

jest.mock("sonner", () => ({
  toast: {
    error: (...args: unknown[]) => mockToastError(...args)
  }
}));

jest.mock("@shared/utils/logger", () => ({
  logger: {},
  createChildLogger: () => ({
    error: (...args: unknown[]) => mockLoggerError(...args)
  })
}));

describe("useWelcomeSurveyState", () => {
  const baseLocation: LocationData = {
    city: "Austin",
    state: "TX",
    country: "US",
    postalCode: "78701",
    county: "Travis",
    serviceAreas: ["Austin", "Round Rock"],
    placeId: "place-1",
    formattedAddress: "Austin, TX 78701"
  };

  beforeEach(() => {
    mockNormalizeCountyName.mockReset();
    mockToastError.mockReset();
    mockLoggerError.mockReset();
    mockNormalizeCountyName.mockImplementation((value: string) => value);
  });

  it("toggles audiences and enforces max of 3 selections", () => {
    const { result } = renderHook(() =>
      useWelcomeSurveyState({ onSubmit: jest.fn() })
    );

    act(() => {
      result.current.toggleTargetAudience("first_time_homebuyers");
      result.current.toggleTargetAudience("growing_families");
      result.current.toggleTargetAudience("real_estate_investors");
      result.current.toggleTargetAudience("luxury_homebuyers");
    });

    expect(result.current.targetAudiences).toEqual([
      "first_time_homebuyers",
      "growing_families",
      "real_estate_investors"
    ]);

    act(() => {
      result.current.toggleTargetAudience("growing_families");
    });

    expect(result.current.targetAudiences).toEqual([
      "first_time_homebuyers",
      "real_estate_investors"
    ]);
  });

  it("uses carousel API for next/previous and blocks next when step invalid", () => {
    const { result } = renderHook(() =>
      useWelcomeSurveyState({ onSubmit: jest.fn() })
    );

    let onSelect: (() => void) | undefined;
    const scrollNext = jest.fn();
    const scrollPrev = jest.fn();
    const selectedScrollSnap = jest.fn(() => 1);

    const api = {
      on: (event: string, callback: () => void) => {
        if (event === "select") onSelect = callback;
      },
      selectedScrollSnap,
      scrollNext,
      scrollPrev
    };

    act(() => {
      result.current.setApi(api as never);
    });

    act(() => {
      onSelect?.();
    });

    expect(result.current.currentStep).toBe(1);

    act(() => {
      result.current.handleNext();
      result.current.handlePrevious();
    });

    expect(scrollNext).not.toHaveBeenCalled();
    expect(scrollPrev).toHaveBeenCalledTimes(1);
  });

  it("submits normalized payload and handles location detail toggle resets", async () => {
    const onSubmit = jest.fn().mockResolvedValue(undefined);
    const { result } = renderHook(() => useWelcomeSurveyState({ onSubmit }));

    act(() => {
      result.current.setLocation(baseLocation);
    });

    act(() => {
      result.current.setReferralSource("other");
      result.current.setReferralSourceOther("From a friend");
      result.current.toggleTargetAudience("first_time_homebuyers");
      result.current.setCountyOverride("  Travis County  ");
      result.current.setServiceAreasOverride("Austin, Cedar Park");
    });

    mockNormalizeCountyName.mockReturnValue("Travis County");

    await act(async () => {
      await result.current.handleSubmit({ preventDefault: jest.fn() });
    });

    expect(onSubmit).toHaveBeenCalledWith({
      referralSource: "other",
      referralSourceOther: "From a friend",
      location: {
        ...baseLocation,
        county: "Travis County",
        serviceAreas: ["Austin", "Cedar Park"]
      },
      targetAudiences: ["first_time_homebuyers"],
      weeklyPostingFrequency: 3
    });

    act(() => {
      result.current.handleToggleLocationDetails();
    });
    act(() => {
      result.current.setCountyOverride("Will be reset");
      result.current.setServiceAreasOverride("Will be reset");
    });
    act(() => {
      result.current.handleToggleLocationDetails();
    });

    expect(result.current.countyOverride).toBe("Travis");
    expect(result.current.serviceAreasOverride).toBe("Austin, Round Rock");
  });

  it("falls back to existing county/serviceAreas when overrides are empty", async () => {
    const onSubmit = jest.fn().mockResolvedValue(undefined);
    const { result } = renderHook(() => useWelcomeSurveyState({ onSubmit }));

    act(() => {
      result.current.setLocation(baseLocation);
      result.current.setReferralSource("facebook");
      result.current.toggleTargetAudience("first_time_homebuyers");
      result.current.setCountyOverride("   ");
      result.current.setServiceAreasOverride("   ");
    });

    mockNormalizeCountyName.mockReturnValue("");

    await act(async () => {
      await result.current.handleSubmit();
    });

    expect(onSubmit).toHaveBeenCalledWith(
      expect.objectContaining({
        referralSource: "facebook",
        referralSourceOther: undefined,
        location: expect.objectContaining({
          county: "Travis",
          serviceAreas: ["Austin", "Round Rock"]
        })
      })
    );
  });

  it("surfaces submit errors and resets submitting state", async () => {
    const onSubmit = jest.fn().mockRejectedValue(new Error("boom"));
    const { result } = renderHook(() => useWelcomeSurveyState({ onSubmit }));

    act(() => {
      result.current.setLocation(baseLocation);
      result.current.setReferralSource("facebook");
      result.current.toggleTargetAudience("first_time_homebuyers");
    });

    await act(async () => {
      await result.current.handleSubmit();
    });

    expect(mockLoggerError).toHaveBeenCalled();
    expect(mockToastError).toHaveBeenCalledWith("Survey submission error: Error: boom");
    expect(result.current.isSubmitting).toBe(false);
  });
});
