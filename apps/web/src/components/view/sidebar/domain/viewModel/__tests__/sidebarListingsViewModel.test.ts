import {
  buildSidebarListingsViewModel,
  sortSidebarListings
} from "@web/src/components/view/sidebar/domain/viewModel/sidebarListingsViewModel";

describe("sidebarListingsViewModel", () => {
  it("normalizes blank titles and sorts by most recently opened", () => {
    const sorted = sortSidebarListings([
      {
        id: "a",
        title: "  ",
        listingStage: "plan",
        lastOpenedAt: "2026-01-01T00:00:00.000Z"
      },
      {
        id: "b",
        title: "New",
        listingStage: "complete",
        lastOpenedAt: "2026-02-01T00:00:00.000Z"
      }
    ]);

    expect(sorted.map((item) => item.id)).toEqual(["b", "a"]);
    expect(sorted[1]?.title).toBe("Untitled listing");
  });

  it("returns top three displayed listings and hasMore flag", () => {
    const result = buildSidebarListingsViewModel([
      { id: "1", title: "One", listingStage: "plan" },
      { id: "2", title: "Two", listingStage: "plan" },
      { id: "3", title: "Three", listingStage: "plan" },
      { id: "4", title: "Four", listingStage: "plan" }
    ]);

    expect(result.displayedListingItems).toHaveLength(3);
    expect(result.hasMoreListings).toBe(true);
    expect(result.listingItems).toHaveLength(4);
  });
});
