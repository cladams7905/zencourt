import {
  getCategoryConfig,
  getCategoryDisplayLimit,
  getCategoryPoolMax,
  getCategoryMinRating,
  getCategoryMinReviews,
  getCategoryFallbackQueries,
  getCategoryMinPrimaryResults,
  getCategoryTargetQueryCount
} from "@web/src/server/services/_config/community/categoryConfig";

describe("category config", () => {
  it("returns configured values for known categories", () => {
    expect(getCategoryConfig("dining")?.displayLimit).toBe(8);
    expect(getCategoryPoolMax("dining")).toBe(50);
    expect(getCategoryMinRating("dining")).toBe(4.5);
    expect(getCategoryMinReviews("dining")).toBe(100);
    expect(getCategoryFallbackQueries("dining").length).toBeGreaterThan(0);
    expect(getCategoryMinPrimaryResults("dining")).toBe(3);
    expect(getCategoryTargetQueryCount("dining")).toBe(2);
  });

  it("uses defaults for unknown categories", () => {
    expect(getCategoryConfig("unknown")).toBeUndefined();
    expect(getCategoryDisplayLimit("unknown")).toBe(5);
    expect(getCategoryPoolMax("unknown")).toBe(30);
    expect(getCategoryMinRating("unknown")).toBe(0);
    expect(getCategoryMinReviews("unknown")).toBe(0);
    expect(getCategoryFallbackQueries("unknown")).toEqual([]);
    expect(getCategoryMinPrimaryResults("unknown")).toBe(2);
    expect(getCategoryTargetQueryCount("unknown")).toBe(1);
  });
});
