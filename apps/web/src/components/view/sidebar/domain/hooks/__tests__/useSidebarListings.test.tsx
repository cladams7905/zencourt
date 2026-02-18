import { act, renderHook } from "@testing-library/react";
import { emitListingSidebarUpdate } from "@web/src/lib/listingSidebarEvents";
import { useSidebarListings } from "@web/src/components/view/sidebar/domain/hooks/useSidebarListings";
import type { ListingSidebarItem } from "@web/src/components/view/sidebar/shared";

describe("useSidebarListings", () => {
  const baseListings: ListingSidebarItem[] = [
    {
      id: "listing-1",
      title: "First",
      listingStage: "review",
      lastOpenedAt: "2024-01-01T00:00:00.000Z"
    },
    {
      id: "listing-2",
      title: "Second",
      listingStage: "categorize",
      lastOpenedAt: "2024-01-02T00:00:00.000Z"
    }
  ];

  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.clearAllTimers();
    jest.useRealTimers();
  });

  it("maps initial listings through the sidebar view model", () => {
    const { result } = renderHook(() => useSidebarListings(baseListings));

    expect(result.current.displayedListingItems).toHaveLength(2);
    expect(result.current.displayedListingItems[0].id).toBe("listing-2");
    expect(result.current.hasMoreListings).toBe(false);
    expect(result.current.pendingListingIds.size).toBe(0);
  });

  it("updates existing listings and clears pending state after timeout", () => {
    const { result } = renderHook(() => useSidebarListings(baseListings));

    act(() => {
      emitListingSidebarUpdate({
        id: "listing-1",
        title: "Updated Title",
        listingStage: "generate"
      });
    });

    expect(result.current.pendingListingIds.has("listing-1")).toBe(true);
    expect(
      result.current.displayedListingItems.find((item) => item.id === "listing-1")
        ?.title
    ).toBe("Updated Title");

    act(() => {
      jest.advanceTimersByTime(1200);
    });

    expect(result.current.pendingListingIds.has("listing-1")).toBe(false);
  });

  it("restarts pending timeout when the same listing updates repeatedly", () => {
    const clearTimeoutSpy = jest.spyOn(window, "clearTimeout");
    const { result } = renderHook(() => useSidebarListings(baseListings));

    act(() => {
      emitListingSidebarUpdate({ id: "listing-1", title: "First update" });
      emitListingSidebarUpdate({ id: "listing-1", title: "Second update" });
    });

    expect(clearTimeoutSpy).toHaveBeenCalled();
    expect(result.current.pendingListingIds.has("listing-1")).toBe(true);
    expect(
      result.current.displayedListingItems.find((item) => item.id === "listing-1")
        ?.title
    ).toBe("Second update");

    act(() => {
      jest.advanceTimersByTime(1200);
    });

    expect(result.current.pendingListingIds.has("listing-1")).toBe(false);
    clearTimeoutSpy.mockRestore();
  });

  it("prepends unknown listing updates with defaults", () => {
    const { result } = renderHook(() => useSidebarListings(baseListings));

    act(() => {
      emitListingSidebarUpdate({ id: "listing-new" });
    });

    expect(result.current.displayedListingItems[0].id).toBe("listing-new");
    expect(result.current.displayedListingItems[0].listingStage).toBe(
      "categorize"
    );
  });
});
