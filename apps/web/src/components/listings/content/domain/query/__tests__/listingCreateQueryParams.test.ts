import {
  parseInitialMediaTab,
  parseInitialSubcategory,
  stringifyListingContentSearchParams
} from "../queryParams";

describe("llistingContentQueryParams", () => {
  it("parses media tab from query param", () => {
    expect(parseInitialMediaTab("photos")).toBe("images");
    expect(parseInitialMediaTab("videos")).toBe("videos");
    expect(parseInitialMediaTab(undefined)).toBe("videos");
  });

  it("parses valid listing subcategory and falls back when invalid", () => {
    expect(parseInitialSubcategory("new_listing")).toBe("new_listing");
    expect(parseInitialSubcategory("invalid")).toBe("new_listing");
    expect(parseInitialSubcategory(undefined)).toBe("new_listing");
  });

  it("stringifies scalar and array search params while skipping undefined values", () => {
    expect(
      stringifyListingContentSearchParams({
        mediaTab: "images",
        subcategory: "new_listing",
        tags: ["kitchen", "island"],
        ignored: undefined
      })
    ).toBe(
      "mediaTab=images&subcategory=new_listing&tags=kitchen&tags=island"
    );
  });
});
