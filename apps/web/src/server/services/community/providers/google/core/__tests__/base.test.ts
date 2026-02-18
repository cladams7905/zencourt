import {
  buildBaseCategoryFieldValues,
  buildCategoryQueryPlan,
  getBaseDetailCallsForCategories
} from "@web/src/server/services/community/providers/google/core/base";

describe("google core base", () => {
  it("builds category query plan for requested categories", () => {
    const logger = { info: jest.fn() };
    const plan = buildCategoryQueryPlan({
      location: {
        city: "Austin",
        state_id: "TX",
        county_name: "Travis",
        lat: 30.27,
        lng: -97.74,
        population: 100,
        zips: "78701"
      },
      zipCode: "78701",
      categoriesToFetch: new Set(["dining"]),
      allowedSeasonalCategories: new Set(),
      usedSeasonalHeaders: new Set(),
      logger
    });

    expect(plan).toHaveLength(1);
    expect(plan[0].key).toBe("dining");
    expect(plan[0].queries.length).toBeGreaterThan(0);
  });

  it("maps base field values with skip handling", () => {
    const map = new Map([
      ["dining_list", "- D1"],
      ["coffee_brunch_list", "- C1"]
    ]);

    const values = buildBaseCategoryFieldValues({
      skipCategories: new Set(["coffee_brunch"]),
      listMap: map as never
    });

    expect(values.dining_list).toBe("- D1");
    expect(values.coffee_brunch_list).toBe("- (none found)");
  });

  it("estimates details calls only for fetched categories", () => {
    const calls = getBaseDetailCallsForCategories(new Set(["dining", "shopping"]));
    expect(calls).toBeGreaterThan(0);
  });

  it("returns empty query plan when no categories are requested", () => {
    const plan = buildCategoryQueryPlan({
      location: {
        city: "Austin",
        state_id: "TX",
        county_name: "Travis",
        lat: 30.27,
        lng: -97.74,
        population: 100,
        zips: "78701"
      },
      zipCode: "78701",
      categoriesToFetch: new Set(),
      allowedSeasonalCategories: new Set(),
      usedSeasonalHeaders: new Set(),
      logger: { info: jest.fn() }
    });

    expect(plan).toEqual([]);
  });
});
