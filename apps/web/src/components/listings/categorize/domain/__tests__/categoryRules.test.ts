import {
  MULTI_ROOM_CATEGORIES,
  formatCategoryLabel,
  getCategoryBase,
  getNextCategoryValue,
  normalizeCategory
} from "@web/src/components/listings/categorize/domain/categoryRules";
import { UNCATEGORIZED_CATEGORY_ID } from "@web/src/components/listings/categorize/shared/constants";

describe("categoryRules", () => {
  it("normalizes category values", () => {
    expect(normalizeCategory("  BeDrOoM-2  ")).toBe("bedroom-2");
  });

  it("extracts base category names", () => {
    expect(getCategoryBase("bedroom-3")).toBe("bedroom");
    expect(getCategoryBase("kitchen")).toBe("kitchen");
  });

  it("includes only allow-numbering categories in MULTI_ROOM_CATEGORIES", () => {
    expect(MULTI_ROOM_CATEGORIES.has("bedroom")).toBe(true);
    expect(MULTI_ROOM_CATEGORIES.has("bathroom")).toBe(true);
    expect(MULTI_ROOM_CATEGORIES.has("kitchen")).toBe(false);
  });

  it("formats uncategorized label", () => {
    expect(formatCategoryLabel(UNCATEGORIZED_CATEGORY_ID, {})).toBe(
      "Uncategorized"
    );
  });

  it("formats numbered label when multi-room category has multiple instances", () => {
    expect(formatCategoryLabel("bedroom-2", { bedroom: 2 })).toBe("Bedroom 2");
  });

  it("formats known single-instance category without number", () => {
    expect(formatCategoryLabel("kitchen", { kitchen: 1 })).toBe("Kitchen");
  });

  it("falls back to titleized label for unknown categories", () => {
    expect(formatCategoryLabel("bonus-room-2", { "bonus-room": 2 })).toBe(
      "Bonus Room"
    );
  });

  it("returns base category when no existing variants are present", () => {
    expect(getNextCategoryValue("Bedroom", ["kitchen", "office"])).toBe(
      "bedroom"
    );
  });

  it("increments category suffix from existing values", () => {
    expect(
      getNextCategoryValue("bedroom", ["bedroom", "bedroom-2", "bedroom-4"])
    ).toBe("bedroom-5");
  });

  it("ignores invalid suffixes when computing next category value", () => {
    expect(
      getNextCategoryValue("bedroom", ["bedroom-a", "bedroom-0", "bedroom-2"])
    ).toBe("bedroom-3");
  });
});
