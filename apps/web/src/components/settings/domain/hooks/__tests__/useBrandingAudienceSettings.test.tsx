import { act, renderHook } from "@testing-library/react";
import { useBrandingAudienceSettings } from "@web/src/components/settings/domain/hooks/useBrandingAudienceSettings";

const mockRefresh = jest.fn();
const mockToastSuccess = jest.fn();
const mockToastError = jest.fn();
const mockUpdateTargetAudiences = jest.fn();

jest.mock("next/navigation", () => ({
  useRouter: () => ({
    refresh: mockRefresh
  })
}));

jest.mock("sonner", () => ({
  toast: {
    success: (...args: unknown[]) => mockToastSuccess(...args),
    error: (...args: unknown[]) => mockToastError(...args)
  }
}));

jest.mock("@web/src/server/actions/db/userAdditional", () => ({
  updateTargetAudiences: (...args: unknown[]) => mockUpdateTargetAudiences(...args)
}));

describe("useBrandingAudienceSettings", () => {
  const baseArgs = {
    userId: "user-1",
    userAdditional: {
      targetAudiences: ["first_time_homebuyers"],
      audienceDescription: "Initial"
    } as never
  };

  beforeEach(() => {
    mockRefresh.mockReset();
    mockToastSuccess.mockReset();
    mockToastError.mockReset();
    mockUpdateTargetAudiences.mockReset();
  });

  it("toggles audiences and enforces 2 max", () => {
    const { result } = renderHook(() => useBrandingAudienceSettings(baseArgs));

    act(() => {
      result.current.toggleTargetAudience("growing_families");
    });
    expect(result.current.targetAudiences.sort()).toEqual([
      "first_time_homebuyers",
      "growing_families"
    ]);

    act(() => {
      result.current.toggleTargetAudience("luxury_homebuyers");
    });
    expect(result.current.targetAudiences.sort()).toEqual([
      "first_time_homebuyers",
      "growing_families"
    ]);

    act(() => {
      result.current.toggleTargetAudience("first_time_homebuyers");
    });
    expect(result.current.targetAudiences).toEqual(["growing_families"]);
  });

  it("persists trimmed description, refreshes, and resets dirty state", async () => {
    mockUpdateTargetAudiences.mockResolvedValue({
      audienceDescription: "From server"
    });

    const { result } = renderHook(() => useBrandingAudienceSettings(baseArgs));

    act(() => {
      result.current.setAudienceDescription("  New notes  ");
      result.current.toggleTargetAudience("growing_families");
    });
    expect(result.current.isTargetAudiencesDirty).toBe(true);

    await act(async () => {
      await result.current.handleSaveTargetAudiences();
    });

    expect(mockUpdateTargetAudiences).toHaveBeenCalledWith(
      "user-1",
      ["first_time_homebuyers", "growing_families"],
      "New notes"
    );
    expect(mockToastSuccess).toHaveBeenCalledWith(
      "Target audiences updated successfully!"
    );
    expect(mockRefresh).toHaveBeenCalled();
    expect(result.current.audienceDescription).toBe("From server");
    expect(result.current.isTargetAudiencesDirty).toBe(false);
  });

  it("surfaces save errors", async () => {
    mockUpdateTargetAudiences.mockRejectedValue(new Error("boom"));

    const { result } = renderHook(() => useBrandingAudienceSettings(baseArgs));

    await act(async () => {
      await result.current.handleSaveTargetAudiences();
    });

    expect(mockToastError).toHaveBeenCalledWith("boom");
    expect(result.current.isLoadingAudiences).toBe(false);
  });
});
