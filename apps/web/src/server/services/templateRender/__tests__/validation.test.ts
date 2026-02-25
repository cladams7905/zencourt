import {
  parseListingSubcategory,
  sanitizeCaptionItems
} from "../validation";
import { LISTING_CONTENT_SUBCATEGORIES } from "@shared/types/models";

describe("templateRender validation", () => {
  it("parses valid listing subcategory", () => {
    const valid = LISTING_CONTENT_SUBCATEGORIES[0];
    expect(parseListingSubcategory(valid)).toBe(valid);
  });

  it("throws on invalid listing subcategory", () => {
    expect(() => parseListingSubcategory("not-real")).toThrow(
      "A valid listing subcategory is required"
    );
    expect(() => parseListingSubcategory(null)).toThrow(
      "A valid listing subcategory is required"
    );
  });

  it("sanitizes caption items and preserves cache identity when present", () => {
    const result = sanitizeCaptionItems([
      {
        id: "  c1  ",
        hook: " Hook ",
        caption: " Caption ",
        body: [
          { header: " H1 ", content: " C1 " },
          { header: "", content: "" }
        ],
        cacheKeyTimestamp: 123,
        cacheKeyId: 7
      },
      { id: "", caption: "x" }
    ]);

    expect(result).toEqual([
      {
        id: "c1",
        hook: "Hook",
        caption: "Caption",
        broll_query: null,
        cta: null,
        body: [{ header: "H1", content: "C1" }],
        cacheKeyTimestamp: 123,
        cacheKeyId: 7
      }
    ]);
  });

  it("drops structurally empty items", () => {
    const result = sanitizeCaptionItems([
      { id: "x", hook: "", caption: "", body: [] }
    ]);

    expect(result).toEqual([]);
  });
});
