import { renderHook } from "@testing-library/react";
import { useCategorizeDerivedState } from "@web/src/components/listings/categorize/domain/hooks/useCategorizeDerivedState";
import { UNCATEGORIZED_CATEGORY_ID } from "@web/src/components/listings/categorize/shared";

describe("useCategorizeDerivedState", () => {
  it("builds categorized images and category order with uncategorized first", () => {
    const { result } = renderHook(() =>
      useCategorizeDerivedState({
        images: [
          { id: "1", url: "u1", filename: "a.jpg", category: null },
          { id: "2", url: "u2", filename: "b.jpg", category: "kitchen" },
          { id: "3", url: "u3", filename: "c.jpg", category: "bedroom-2" }
        ],
        customCategories: ["bedroom-1"]
      })
    );

    expect(result.current.categorizedImages[UNCATEGORIZED_CATEGORY_ID]).toHaveLength(
      1
    );
    expect(result.current.categoryOrder[0]).toBe(UNCATEGORIZED_CATEGORY_ID);
    expect(result.current.categoryOrder).toEqual([
      UNCATEGORIZED_CATEGORY_ID,
      "bedroom-1",
      "bedroom-2",
      "kitchen"
    ]);
    expect(result.current.baseCategoryCounts).toEqual({
      bedroom: 2,
      kitchen: 1
    });
  });

  it("computes limit flags", () => {
    const { result } = renderHook(() =>
      useCategorizeDerivedState({
        images: [
          { id: "1", url: "u1", filename: "a.jpg", category: "kitchen" },
          { id: "2", url: "u2", filename: "b.jpg", category: "kitchen" },
          { id: "3", url: "u3", filename: "c.jpg", category: "kitchen" },
          { id: "4", url: "u4", filename: "d.jpg", category: "kitchen" }
        ],
        customCategories: [
          "a",
          "b",
          "c",
          "d",
          "e",
          "f",
          "g",
          "h",
          "i",
          "j",
          "k"
        ]
      })
    );

    expect(result.current.hasOverLimit).toBe(true);
    expect(result.current.hasTooManyCategories).toBe(true);
    expect(result.current.hasEmptyCategory).toBe(true);
    expect(result.current.hasUncategorized).toBe(false);
  });
});
