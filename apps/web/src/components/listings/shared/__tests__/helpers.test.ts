import {
  buildListingStageSteps,
  formatListingStageLabel,
  resolveListingPath
} from "@web/src/components/listings/shared/helpers";

describe("listings shared helpers", () => {
  it("resolves listing path by stage with categorize fallback", () => {
    expect(resolveListingPath({ id: "1", listingStage: "review" })).toBe(
      "/listings/1/review"
    );
    expect(resolveListingPath({ id: "1", listingStage: "generate" })).toBe(
      "/listings/1/generate"
    );
    expect(resolveListingPath({ id: "1", listingStage: "create" })).toBe(
      "/listings/1/create"
    );
    expect(resolveListingPath({ id: "1", listingStage: null })).toBe(
      "/listings/1/categorize"
    );
  });

  it("formats stage labels with draft fallback", () => {
    expect(formatListingStageLabel("review")).toBe("Review");
    expect(formatListingStageLabel(null)).toBe("Draft");
  });

  it("builds stage step state based on active stage", () => {
    const steps = buildListingStageSteps("review");

    expect(steps).toHaveLength(3);
    expect(steps[0]).toMatchObject({ label: "Categorize", completed: true });
    expect(steps[1]).toMatchObject({ label: "Review", active: true });
    expect(steps[2]).toMatchObject({ label: "Create", active: false });
  });
});
