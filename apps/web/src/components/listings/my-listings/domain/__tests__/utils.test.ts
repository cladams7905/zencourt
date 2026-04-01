import {
  formatDateLabel,
  formatStageLabel,
  resolveListingPath,
  toListingRowViewModel
} from "@web/src/components/listings/my-listings/domain/utils";

describe("myListingsUtils", () => {
  it("resolves listing paths by stage", () => {
    expect(resolveListingPath({ id: "1", listingStage: "review" })).toBe(
      "/listings/1/stage/review"
    );
    expect(resolveListingPath({ id: "1", listingStage: "generate" })).toBe(
      "/listings/1/stage/generate"
    );
    expect(resolveListingPath({ id: "1", listingStage: "complete" })).toBe(
      "/listings/1/content"
    );
    expect(resolveListingPath({ id: "1", listingStage: "categorize" })).toBe(
      "/listings/1/stage/categorize"
    );
    expect(resolveListingPath({ id: "1", listingStage: "upload" })).toBe(
      "/listings/1/stage/upload"
    );
    expect(resolveListingPath({ id: "1", listingStage: null })).toBe(
      "/listings/1/stage/categorize"
    );
  });

  it("formats stage/date fallback labels", () => {
    expect(formatStageLabel(null)).toBe("Draft");
    expect(formatStageLabel("review")).toBe("Review");
    expect(formatDateLabel(null)).toBe("Never");
    expect(formatDateLabel("bad-date")).toBe("Never");
  });

  it("maps summary item to row view model", () => {
    const row = toListingRowViewModel({
      id: "listing-1",
      title: "  Nice Home  ",
      listingStage: "review",
      lastOpenedAt: "2026-01-01T00:00:00.000Z",
      imageCount: 25,
      previewImages: ["a", "b"]
    });

    expect(row.id).toBe("listing-1");
    expect(row.path).toBe("/listings/listing-1/stage/review");
    expect(row.title).toBe("Nice Home");
    expect(row.imageCount).toBe(20);
    expect(row.remainingCount).toBe(18);
    expect(row.stageLabel).toBe("Review");
    expect(row.showDraftBadge).toBe(true);
  });

  it("applies fallback row values when listing fields are missing", () => {
    const row = toListingRowViewModel({
      id: "listing-2",
      title: "   ",
      listingStage: null,
      lastOpenedAt: null,
      imageCount: null,
      previewImages: null
    } as never);

    expect(row.path).toBe("/listings/listing-2/stage/categorize");
    expect(row.title).toBe("Untitled listing");
    expect(row.lastOpenedLabel).toBe("Never");
    expect(row.imageCount).toBe(0);
    expect(row.previewImages).toEqual([]);
    expect(row.remainingCount).toBe(0);
    expect(row.stageLabel).toBe("Categorize");
    expect(row.draftTooltipLabel).toBe("Draft (Draft)");
    expect(row.showDraftBadge).toBe(true);
  });

  it("omits the draft badge for complete listings", () => {
    const row = toListingRowViewModel({
      id: "listing-3",
      title: "Ready",
      listingStage: "complete",
      lastOpenedAt: null,
      imageCount: 1,
      previewImages: []
    } as never);

    expect(row.stageLabel).toBe("Complete");
    expect(row.showDraftBadge).toBe(false);
  });
});
