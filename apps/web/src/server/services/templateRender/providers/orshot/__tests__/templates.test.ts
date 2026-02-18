import {
  getTemplatesForSubcategory,
  pickRandomTemplatesForSubcategory
} from "../templates";

describe("templateRender/providers/orshot/templates", () => {
  it("returns templates matching the requested subcategory", () => {
    const templates = getTemplatesForSubcategory("new_listing");

    expect(templates.length).toBeGreaterThan(0);
    expect(
      templates.every((template) => template.subcategories.includes("new_listing"))
    ).toBe(true);
  });

  it("returns empty list for non-positive count", () => {
    expect(
      pickRandomTemplatesForSubcategory({
        subcategory: "new_listing",
        count: 0
      })
    ).toEqual([]);
  });

  it("returns up to count templates from the candidate set", () => {
    const all = getTemplatesForSubcategory("open_house");
    const picked = pickRandomTemplatesForSubcategory({
      subcategory: "open_house",
      count: 3,
      random: () => 0.2
    });

    expect(picked.length).toBeLessThanOrEqual(3);
    expect(picked.length).toBeLessThanOrEqual(all.length);
    expect(picked.every((template) => all.some((candidate) => candidate.id === template.id))).toBe(
      true
    );
  });
});
