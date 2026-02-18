import {
  parseInitialMediaTab,
  parseInitialSubcategory
} from "@web/src/components/listings/create/domain/listingCreateQueryParams";

describe("listingCreateQueryParams", () => {
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
});
