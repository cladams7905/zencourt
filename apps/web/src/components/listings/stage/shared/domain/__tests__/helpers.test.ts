import {
  buildListingStageSteps,
  formatListingStageLabel,
  resolveListingPath
} from "@web/src/components/listings/stage/shared/domain/helpers";

describe("listings stage shared helpers", () => {
  it("resolves listing path by stage with categorize fallback", () => {
    expect(resolveListingPath({ id: "1", listingStage: "review" })).toBe(
      "/listings/1/stage/review"
    );
    expect(resolveListingPath({ id: "1", listingStage: "generate" })).toBe(
      "/listings/1/stage/generate"
    );
    expect(resolveListingPath({ id: "1", listingStage: "complete" })).toBe(
      "/listings/1/content"
    );
    expect(resolveListingPath({ id: "1", listingStage: "upload" })).toBe(
      "/listings/1/stage/upload"
    );
    expect(resolveListingPath({ id: "1", listingStage: null })).toBe(
      "/listings/1/stage/categorize"
    );
  });

  it("formats stage labels with draft fallback", () => {
    expect(formatListingStageLabel("review")).toBe("Review");
    expect(formatListingStageLabel(null)).toBe("Draft");
  });

  it("builds stage step state based on active stage", () => {
    const steps = buildListingStageSteps("review");

    expect(steps).toHaveLength(4);
    expect(steps[0]).toMatchObject({ label: "Upload", completed: true });
    expect(steps[1]).toMatchObject({ label: "Categorize", completed: true });
    expect(steps[2]).toMatchObject({ label: "Review", active: true });
    expect(steps[3]).toMatchObject({ label: "Complete", active: false });
  });
});
