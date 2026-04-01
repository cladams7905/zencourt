const mockSampleRandom = jest.fn();
const mockFormatPlaceList = jest.fn();

jest.mock(
  "@web/src/server/services/communityData/providers/google/core/places",
  () => ({
    sampleRandom: (...args: unknown[]) => mockSampleRandom(...args),
    formatPlaceList: (...args: unknown[]) => mockFormatPlaceList(...args)
  })
);

import {
  normalizeQueryKey,
  mergeUniqueQueries,
  buildSeasonalQueries,
  pickSeasonalCategories,
  estimateSearchCallsForQueries,
  buildSeasonalQuerySections
} from "@web/src/server/services/communityData/providers/google/core/seasonal";

describe("google seasonal", () => {
  beforeEach(() => {
    mockSampleRandom.mockReset();
    mockFormatPlaceList.mockReset();
    mockSampleRandom.mockImplementation((arr: unknown[]) => arr.slice(0, 1));
    mockFormatPlaceList.mockReturnValue("- Place");
  });

  it("normalizes and merges queries", () => {
    expect(normalizeQueryKey("  Hello ")).toBe("hello");
    expect(mergeUniqueQueries(["A", "b"], [" a ", "C"]).length).toBe(3);
  });

  it("respects allowed category filtering in seasonal query building", () => {
    const result = buildSeasonalQueries(
      { state_id: "TX" } as never,
      "dining",
      ["query"],
      new Date("2026-02-01"),
      new Set(["education"] as never)
    );

    expect(result.queries).toEqual(["query"]);
    expect(result.seasonalQueries.size).toBe(0);
  });

  it("adds seasonal query and tracks used headers", () => {
    const used = new Set<string>();
    const result = buildSeasonalQueries(
      { state_id: "TX" } as never,
      "community_events",
      ["base query"],
      new Date("2026-12-10"),
      undefined,
      used
    );

    expect(result.queries.length).toBeGreaterThan(0);
    expect(result.seasonalQueries.size).toBeLessThanOrEqual(1);
    expect(used.size).toBeLessThanOrEqual(1);
  });

  it("filters out already-used seasonal headers", () => {
    const result = buildSeasonalQueries(
      { state_id: "TX" } as never,
      "community_events",
      ["base query"],
      new Date("2026-12-10"),
      undefined,
      new Set(["holiday markets in austin tx", "christmas events in austin tx"])
    );

    expect(result.queries).toContain("base query");
    expect([...result.seasonalQueries]).not.toContain(
      "holiday markets in austin tx"
    );
    expect([...result.seasonalQueries]).not.toContain(
      "christmas events in austin tx"
    );
  });

  it("selects a capped set of seasonal categories", () => {
    const picked = pickSeasonalCategories(
      "seed",
      ["dining", "coffee_brunch", "education"] as never,
      2
    );
    expect(picked).toHaveLength(2);
  });

  it("returns all seasonal categories when the count is not restrictive", () => {
    const categories = ["dining", "coffee_brunch"] as never;

    expect(pickSeasonalCategories("seed", categories, 5)).toEqual(categories);
  });

  it("estimates search calls with seasonal overrides", () => {
    const calls = estimateSearchCallsForQueries(
      "dining" as never,
      ["Q1", "Q2"],
      new Set(["q1"]),
      4
    );
    expect(calls).toBe(5);
  });

  it("reduces anchor count for low-priority categories and empty query lists", () => {
    expect(
      estimateSearchCallsForQueries(
        "education" as never,
        ["Q1", "Q2"],
        new Set(),
        4
      )
    ).toBe(2);
    expect(
      estimateSearchCallsForQueries("dining" as never, [], new Set(), 4)
    ).toBe(0);
  });

  it("builds seasonal query sections from source queries", () => {
    const sections = buildSeasonalQuerySections(
      {
        dining: [
          { name: "Cafe", sourceQueries: ["Winter activities"] },
          { name: "Park", sourceQueries: ["Winter activities"] }
        ]
      } as never,
      3,
      2
    );

    expect(sections["Winter activities"]).toBe("- Place");
  });

  it("skips seasonal sections when formatter returns none found", () => {
    mockFormatPlaceList.mockReturnValueOnce("- (none found)");
    const sections = buildSeasonalQuerySections(
      {
        dining: [{ name: "Cafe", sourceQueries: ["Ignore Me"] }]
      } as never,
      3,
      1
    );
    expect(sections).toEqual({});
  });

  it("returns empty sections when no places contain source queries", () => {
    const sections = buildSeasonalQuerySections(
      {
        dining: [{ name: "Cafe" }]
      } as never,
      3,
      1
    );

    expect(mockSampleRandom).toHaveBeenCalledWith([], 1);
    expect(sections).toEqual({});
  });
});
