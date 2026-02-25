import {
  AUDIENCE_AUGMENT_CATEGORIES,
  getAudienceConfig,
  getAudienceAugmentQueries,
  getAllAudienceAugmentQueries,
  getAudienceAugmentLimit
} from "@web/src/server/services/_config/community/audienceConfig";

describe("audience config", () => {
  it("returns config and queries for known audience", () => {
    expect(AUDIENCE_AUGMENT_CATEGORIES).toContain("dining");
    expect(getAudienceConfig("growing_families")).toBeDefined();
    expect(getAudienceAugmentQueries("growing_families", "dining")).toEqual([
      "family restaurant kids menu"
    ]);
    expect(getAllAudienceAugmentQueries("growing_families")).toBeDefined();
    expect(getAudienceAugmentLimit("growing_families", "dining")).toBe(10);
  });

  it("returns defaults for unknown audience", () => {
    expect(getAudienceConfig("unknown")).toBeUndefined();
    expect(getAudienceAugmentQueries("unknown", "dining")).toEqual([]);
    expect(getAllAudienceAugmentQueries("unknown")).toBeUndefined();
    expect(getAudienceAugmentLimit("unknown", "dining")).toBe(10);
    expect(getAudienceAugmentLimit("unknown", "neighborhoods" as never)).toBe(
      6
    );
  });
});
