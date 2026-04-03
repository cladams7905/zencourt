import {
  buildListingStageSteps,
  canAccessListingStage,
  formatListingStageLabel,
  resolveListingPath,
  resolveListingResumePath
} from "@web/src/components/listings/stage/shared/domain/helpers";

describe("listings stage shared helpers", () => {
  it("resolves listing path by stage with plan fallback", () => {
    expect(resolveListingResumePath({ id: "1", listingStage: "review" })).toBe(
      "/listings/1/stage/review"
    );
    expect(resolveListingResumePath({ id: "1", listingStage: "generate" })).toBe(
      "/listings/1/stage/generate"
    );
    expect(resolveListingResumePath({ id: "1", listingStage: "complete" })).toBe(
      "/listings/1/content"
    );
    expect(resolveListingResumePath({ id: "1", listingStage: "upload" })).toBe(
      "/listings/1/stage/upload"
    );
    expect(resolveListingResumePath({ id: "1", listingStage: null })).toBe(
      "/listings/1/stage/plan"
    );
    expect(resolveListingPath({ id: "1", listingStage: "review" })).toBe(
      "/listings/1/stage/review"
    );
  });

  it("allows current and previous stages but blocks future stages", () => {
    expect(canAccessListingStage("plan", "upload")).toBe(true);
    expect(canAccessListingStage("plan", "plan")).toBe(true);
    expect(canAccessListingStage("plan", "review")).toBe(false);
    expect(canAccessListingStage("review", "plan")).toBe(true);
    expect(canAccessListingStage("review", "generate")).toBe(false);
    expect(canAccessListingStage("generate", "review")).toBe(true);
    expect(canAccessListingStage("complete", "review")).toBe(false);
    expect(canAccessListingStage(null, "plan")).toBe(false);
  });

  it("formats stage labels with draft fallback", () => {
    expect(formatListingStageLabel("review")).toBe("Review");
    expect(formatListingStageLabel(null)).toBe("Draft");
  });

  it("builds stage step state based on active stage", () => {
    const steps = buildListingStageSteps("review");

    expect(steps).toHaveLength(4);
    expect(steps[0]).toMatchObject({ label: "Upload", completed: true });
    expect(steps[1]).toMatchObject({ label: "Plan", completed: true });
    expect(steps[2]).toMatchObject({ label: "Review", active: true });
    expect(steps[3]).toMatchObject({ label: "Complete", active: false });
  });
});
