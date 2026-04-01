import { renderHook } from "@testing-library/react";
import { useCategorizeDerivedState } from "@web/src/components/listings/stage/categorize/domain/hooks/useCategorizeDerivedState";
import { UNCATEGORIZED_CATEGORY_ID } from "@web/src/components/listings/stage/categorize/shared";

describe("useCategorizeDerivedState", () => {
  it("builds category order with uncategorized first and excludes other from workspace accordions", () => {
    const { result } = renderHook(() =>
      useCategorizeDerivedState({
        images: [
          { id: "1", url: "u1", filename: "a.jpg", category: null },
          { id: "2", url: "u2", filename: "b.jpg", category: "kitchen" },
          { id: "3", url: "u3", filename: "c.jpg", category: "bedroom-2" },
          { id: "4", url: "u4", filename: "d.jpg", category: "other" }
        ],
        customCategories: ["bedroom-1"]
      })
    );

    expect(
      result.current.categorizedImages[UNCATEGORIZED_CATEGORY_ID]
    ).toHaveLength(1);
    expect(result.current.categoryOrder).toEqual([
      UNCATEGORIZED_CATEGORY_ID,
      "bedroom-1",
      "bedroom-2",
      "kitchen",
      "other"
    ]);
    expect(result.current.workspaceCategoryOrder).toEqual([
      "bedroom-1",
      "bedroom-2",
      "kitchen"
    ]);
    expect(result.current.baseCategoryCounts).toEqual({
      bedroom: 2,
      kitchen: 1
    });
  });

  it("seeds top two images per category into used images and docks the rest", () => {
    const { result } = renderHook(() =>
      useCategorizeDerivedState({
        images: [
          {
            id: "k1",
            url: "u1",
            filename: "k1.jpg",
            category: "kitchen",
            recommendationScore: 0.9
          },
          {
            id: "k2",
            url: "u2",
            filename: "k2.jpg",
            category: "kitchen",
            recommendationScore: 0.8
          },
          {
            id: "k3",
            url: "u3",
            filename: "k3.jpg",
            category: "kitchen",
            recommendationScore: 0.7
          },
          {
            id: "o1",
            url: "u4",
            filename: "other.jpg",
            category: "other",
            recommendationScore: 0.95,
            shotType: "detail"
          },
          {
            id: "u1",
            url: "u5",
            filename: "uncat.jpg",
            category: null,
            recommendationScore: 0.4
          }
        ],
        customCategories: []
      })
    );

    expect(result.current.usedImagesByCategory.kitchen?.map((img) => img.id)).toEqual([
      "k1",
      "k2"
    ]);
    expect(result.current.dockedImages.map((img) => img.id)).toEqual([
      "o1",
      "k3",
      "u1"
    ]);
    expect(result.current.dockedImages[0]).toMatchObject({
      isOther: true,
      isDetail: true,
      workspacePlacement: "dock"
    });
    expect(result.current.dockedImages[2]).toMatchObject({
      isUncategorized: true,
      workspacePlacement: "dock"
    });
  });

  it("honors manual placement overrides and computes used limits", () => {
    const { result } = renderHook(() =>
      useCategorizeDerivedState({
        images: [
          {
            id: "a",
            url: "u1",
            filename: "a.jpg",
            category: "kitchen",
            recommendationScore: 0.9
          },
          {
            id: "b",
            url: "u2",
            filename: "b.jpg",
            category: "kitchen",
            recommendationScore: 0.8
          },
          {
            id: "c",
            url: "u3",
            filename: "c.jpg",
            category: "kitchen",
            recommendationScore: 0.7
          },
          {
            id: "d",
            url: "u4",
            filename: "d.jpg",
            category: "living-room",
            recommendationScore: 0.6
          }
        ],
        customCategories: [],
        placementOverrides: {
          b: "dock",
          c: "used"
        }
      })
    );

    expect(result.current.usedImagesByCategory.kitchen?.map((img) => img.id)).toEqual([
      "a",
      "c"
    ]);
    expect(result.current.dockedImages.map((img) => img.id)).toContain("b");
    expect(result.current.usedImageCount).toBe(3);
    expect(result.current.hasOverUsedLimit).toBe(false);
    expect(result.current.hasOverLimit).toBe(false);
  });
});
