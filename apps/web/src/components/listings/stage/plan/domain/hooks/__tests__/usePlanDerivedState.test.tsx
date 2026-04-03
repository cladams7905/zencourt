import { renderHook } from "@testing-library/react";
import { usePlanDerivedState } from "@web/src/components/listings/stage/plan/domain/hooks/usePlanDerivedState";
import { UNCATEGORIZED_CATEGORY_ID } from "@web/src/components/listings/stage/plan/shared";

describe("usePlanDerivedState", () => {
  it("builds category order with uncategorized first and includes uncategorized and other in workspace when they have images", () => {
    const { result } = renderHook(() =>
      usePlanDerivedState({
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
      UNCATEGORIZED_CATEGORY_ID,
      "bedroom-2",
      "kitchen",
      "other"
    ]);
    expect(result.current.accordionCategoryOrder).toEqual([
      "bedroom-2",
      "kitchen"
    ]);
    expect(result.current.baseCategoryCounts).toEqual({
      bedroom: 2,
      kitchen: 1
    });
    expect(result.current.hasEmptyCategory).toBe(true);
  });

  it("seeds top two images per category into used images and docks the rest", () => {
    const { result } = renderHook(() =>
      usePlanDerivedState({
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
    expect(result.current.accordionCategoryOrder).toEqual(["kitchen"]);
  });

  it("honors manual placement overrides and computes used limits", () => {
    const { result } = renderHook(() =>
      usePlanDerivedState({
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
    expect(result.current.accordionCategoryOrder).toEqual([
      "kitchen",
      "living-room"
    ]);
  });

  it("prefers persisted scene selection over score-based defaults", () => {
    const { result } = renderHook(() =>
      usePlanDerivedState({
        images: [
          {
            id: "top-score",
            url: "u1",
            filename: "top.jpg",
            category: "kitchen",
            recommendationScore: 0.95,
            metadata: {
              width: 1000,
              height: 750,
              format: "jpeg",
              size: 100,
              lastModified: 1,
              videoScene: {
                selected: false,
                motionVariantId: "default"
              }
            }
          },
          {
            id: "manual-pick",
            url: "u2",
            filename: "manual.jpg",
            category: "kitchen",
            recommendationScore: 0.4,
            metadata: {
              width: 1000,
              height: 750,
              format: "jpeg",
              size: 100,
              lastModified: 1,
              videoScene: {
                selected: true,
                motionVariantId: "tracking"
              }
            }
          }
        ],
        customCategories: []
      })
    );

    expect(result.current.usedImagesByCategory.kitchen?.map((img) => img.id)).toEqual([
      "manual-pick"
    ]);
    expect(result.current.dockedImages.map((img) => img.id)).toContain(
      "top-score"
    );
  });

  it("caps default recommendations across the full listing at the total video limit", () => {
    const images = Array.from({ length: 14 }, (_, index) => ({
      id: `img-${index + 1}`,
      url: `u${index + 1}`,
      filename: `img-${index + 1}.jpg`,
      category: `room-${Math.floor(index / 2) + 1}`,
      recommendationScore: 1 - index * 0.01
    }));

    const { result } = renderHook(() =>
      usePlanDerivedState({
        images,
        customCategories: []
      })
    );

    expect(result.current.usedImageCount).toBe(10);
    expect(result.current.hasOverUsedLimit).toBe(false);
    expect(
      Object.values(result.current.usedImagesByCategory).flatMap((roomImages) =>
        roomImages.map((image) => image.id)
      )
    ).toHaveLength(10);
    expect(result.current.dockedImages.map((image) => image.id)).toEqual([
      "img-11",
      "img-12",
      "img-13",
      "img-14"
    ]);
  });

  it("recomputes recommendations across all images and docks lower-ranked photos when a stronger candidate is added", () => {
    const { result } = renderHook(() =>
      usePlanDerivedState({
        images: [
          {
            id: "room-1a",
            url: "u1",
            filename: "room-1a.jpg",
            category: "room-1",
            recommendationScore: 0.99
          },
          {
            id: "room-1b",
            url: "u2",
            filename: "room-1b.jpg",
            category: "room-1",
            recommendationScore: 0.98
          },
          {
            id: "room-2a",
            url: "u3",
            filename: "room-2a.jpg",
            category: "room-2",
            recommendationScore: 0.97
          },
          {
            id: "room-2b",
            url: "u4",
            filename: "room-2b.jpg",
            category: "room-2",
            recommendationScore: 0.96
          },
          {
            id: "room-3a",
            url: "u5",
            filename: "room-3a.jpg",
            category: "room-3",
            recommendationScore: 0.95
          },
          {
            id: "room-3b",
            url: "u6",
            filename: "room-3b.jpg",
            category: "room-3",
            recommendationScore: 0.94
          },
          {
            id: "room-4a",
            url: "u7",
            filename: "room-4a.jpg",
            category: "room-4",
            recommendationScore: 0.93
          },
          {
            id: "room-4b",
            url: "u8",
            filename: "room-4b.jpg",
            category: "room-4",
            recommendationScore: 0.92
          },
          {
            id: "room-5a",
            url: "u9",
            filename: "room-5a.jpg",
            category: "room-5",
            recommendationScore: 0.91
          },
          {
            id: "room-5b",
            url: "u10",
            filename: "room-5b.jpg",
            category: "room-5",
            recommendationScore: 0.2
          },
          {
            id: "existing-low",
            url: "u11",
            filename: "existing-low.jpg",
            category: "room-6",
            recommendationScore: 0.1
          },
          {
            id: "new-high",
            url: "u12",
            filename: "new-high.jpg",
            category: "room-7",
            recommendationScore: 0.88
          }
        ],
        customCategories: []
      })
    );

    const usedIds = Object.values(result.current.usedImagesByCategory).flatMap(
      (roomImages) => roomImages.map((image) => image.id)
    );

    expect(result.current.usedImageCount).toBe(10);
    expect(usedIds).toContain("new-high");
    expect(usedIds).not.toContain("existing-low");
    expect(result.current.dockedImages.map((image) => image.id)).toContain(
      "existing-low"
    );
  });
});
