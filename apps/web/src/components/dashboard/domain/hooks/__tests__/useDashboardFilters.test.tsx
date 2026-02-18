import { act, renderHook } from "@testing-library/react";
import { useDashboardFilters } from "@web/src/components/dashboard/domain/hooks/useDashboardFilters";

describe("useDashboardFilters", () => {
  it("updates active filter and category", () => {
    const { result } = renderHook(() => useDashboardFilters());

    act(() => {
      result.current.handleFilterToggle("Lifestyle");
    });

    expect(result.current.activeFilter).toBe("Lifestyle");
    expect(result.current.activeCategory).toBe("lifestyle");
    expect(result.current.hasSelectedFilter).toBe(true);
  });

  it("updates content type", () => {
    const { result } = renderHook(() => useDashboardFilters());

    act(() => {
      result.current.handleTypeChange("posts");
    });

    expect(result.current.contentType).toBe("posts");
    expect(result.current.hasSelectedFilter).toBe(true);
  });
});
