import {
  buildCategoryList,
  buildPerplexityCommunityData
} from "@web/src/server/services/communityData/providers/perplexity/pipeline/assembly";

jest.mock(
  "@web/src/server/services/communityData/providers/perplexity/pipeline/formatting",
  () => ({
    formatPerplexityCategoryList: jest.fn(() => "- Cafe")
  })
);

describe("perplexity assembly", () => {
  it("returns none found when payload is empty", () => {
    expect(buildCategoryList("dining", null)).toBe("- (none found)");
    expect(buildCategoryList("dining", { items: [] } as never)).toBe(
      "- (none found)"
    );
  });

  it("formats category list when items are present", () => {
    expect(
      buildCategoryList(
        "dining",
        { items: [{ name: "Cafe" }] } as never,
        "families"
      )
    ).toBe("- Cafe");
  });

  it("builds community payload with defaults", () => {
    const listMap = new Map([
      ["dining", "- D1"],
      ["neighborhoods", "- N1"]
    ] as const);

    const result = buildPerplexityCommunityData({
      zipCode: "78701",
      location: { city: "Austin", state: "TX" },
      listMap,
      seasonalSections: { things_to_do_february: "- Event" }
    });

    expect(result).toEqual(
      expect.objectContaining({
        city: "Austin",
        state: "TX",
        zip_code: "78701",
        neighborhoods_list: "- N1",
        neighborhoods_family_list: "- N1",
        dining_list: "- D1",
        coffee_brunch_list: "- (none found)",
        seasonal_geo_sections: { things_to_do_february: "- Event" }
      })
    );
    expect(typeof result.data_timestamp).toBe("string");
  });
});
