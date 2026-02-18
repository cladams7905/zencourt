import { act, renderHook } from "@testing-library/react";
import * as React from "react";
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

  it("always resolves a non-null active category", () => {
    const { result } = renderHook(() => useDashboardFilters());

    expect(result.current.activeFilter).toBe("Market Insights");
    expect(result.current.activeCategory).toBe("market_insights");
  });

  it("falls back to default filter when active filters are empty", () => {
    const realUseState = React.useState;
    const useStateSpy = jest
      .spyOn(React, "useState")
      .mockImplementation((initial) => {
        if (
          Array.isArray(initial) &&
          initial.length === 1 &&
          initial[0] === "Market Insights"
        ) {
          return [[], jest.fn()] as unknown as ReturnType<typeof React.useState>;
        }
        return realUseState(initial);
      });

    const { result } = renderHook(() => useDashboardFilters());

    expect(result.current.activeFilter).toBe("Market Insights");
    expect(result.current.activeCategory).toBe("market_insights");
    useStateSpy.mockRestore();
  });
});
