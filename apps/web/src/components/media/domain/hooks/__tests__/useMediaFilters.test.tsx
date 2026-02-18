import { act, renderHook } from "@testing-library/react";
import { useMediaFilters } from "@web/src/components/media/domain/hooks/useMediaFilters";

describe("useMediaFilters", () => {
  it("starts with default types and usage sort", () => {
    const { result } = renderHook(() => useMediaFilters());

    expect(result.current.selectedTypes).toEqual(["image", "video"]);
    expect(result.current.usageSort).toBe("none");
  });

  it("toggles media types on and off", () => {
    const { result } = renderHook(() => useMediaFilters());

    act(() => {
      result.current.handleTypeToggle("image", false);
    });
    expect(result.current.selectedTypes).toEqual(["video"]);

    act(() => {
      result.current.handleTypeToggle("image", true);
      result.current.handleTypeToggle("image", true);
    });

    expect(result.current.selectedTypes.sort()).toEqual(["image", "video"]);
  });

  it("updates usage sort", () => {
    const { result } = renderHook(() => useMediaFilters());

    act(() => {
      result.current.setUsageSort("most-used");
    });

    expect(result.current.usageSort).toBe("most-used");
  });
});
