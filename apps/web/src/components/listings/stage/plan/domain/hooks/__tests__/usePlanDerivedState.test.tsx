import { renderHook } from "@testing-library/react";
import { usePlanDerivedState } from "@web/src/components/listings/stage/plan/domain/hooks/usePlanDerivedState";
import { UNCATEGORIZED_CATEGORY_ID } from "@web/src/components/listings/stage/plan/shared";

describe("usePlanDerivedState", () => {
  it("builds category order with uncategorized first and excludes other from room workspace participation", () => {
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
      "kitchen"
    ]);
    expect(result.current.accordionCategoryOrder).toEqual([
      "bedroom-1",
      "bedroom-2",
      "kitchen"
    ]);
    expect(result.current.baseCategoryCounts).toEqual({
      bedroom: 2,
      kitchen: 1
    });
    expect(result.current.hasEmptyCategory).toBe(true);
    expect(result.current.emptyRoomCount).toBe(1);
    expect(result.current.dockedImages.map((image) => image.id)).toContain("4");
  });

  it("recommends the minimum viable three images before docking the rest", () => {
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
      "k2",
      "k3"
    ]);
    expect(result.current.dockedImages.map((img) => img.id)).toEqual([
      "o1",
      "u1"
    ]);
    expect(result.current.dockedImages[0]).toMatchObject({
      isOther: true,
      isDetail: true,
      workspacePlacement: "dock"
    });
    expect(result.current.dockedImages[1]).toMatchObject({
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
    expect(result.current.hasAnyUsedImages).toBe(true);
    expect(result.current.hasTooFewUsedImages).toBe(false);
    expect(result.current.hasTooManyUsedImages).toBe(false);
    expect(result.current.isUsedImageCountValid).toBe(true);
    expect(result.current.accordionCategoryOrder).toEqual([
      "kitchen",
      "living-room"
    ]);
  });

  it("preserves manual image order within a room's used scene row", () => {
    const { result } = renderHook(() =>
      usePlanDerivedState({
        images: [
          {
            id: "dest-1",
            url: "u1",
            filename: "dest-1.jpg",
            category: "kitchen",
            recommendationScore: 0.5
          },
          {
            id: "dest-2",
            url: "u2",
            filename: "dest-2.jpg",
            category: "kitchen",
            recommendationScore: 0.4
          },
          {
            id: "src",
            url: "u3",
            filename: "src.jpg",
            category: "kitchen",
            recommendationScore: 0.95
          }
        ],
        customCategories: [],
        placementOverrides: {
          "dest-1": "used",
          "dest-2": "used",
          src: "used"
        }
      })
    );

    expect(result.current.usedImagesByCategory.kitchen?.map((img) => img.id)).toEqual([
      "dest-1",
      "dest-2",
      "src"
    ]);
  });

  it("reports an invalid continue state when no images are selected for video", () => {
    const { result } = renderHook(() =>
      usePlanDerivedState({
        images: [
          {
            id: "room-1",
            url: "u1",
            filename: "room-1.jpg",
            category: "kitchen",
            recommendationScore: 0.9
          }
        ],
        customCategories: [],
        placementOverrides: {
          "room-1": "dock"
        }
      })
    );

    expect(result.current.usedImageCount).toBe(0);
    expect(result.current.hasAnyUsedImages).toBe(false);
    expect(result.current.hasTooFewUsedImages).toBe(true);
    expect(result.current.hasTooManyUsedImages).toBe(false);
    expect(result.current.isUsedImageCountValid).toBe(false);
  });

  it("flags room categories with photos but zero planned scenes", () => {
    const { result } = renderHook(() =>
      usePlanDerivedState({
        images: [
          {
            id: "kitchen-1",
            url: "u1",
            filename: "kitchen-1.jpg",
            category: "kitchen",
            recommendationScore: 0.9
          },
          {
            id: "bedroom-1",
            url: "u2",
            filename: "bedroom-1.jpg",
            category: "bedroom",
            recommendationScore: 0.8
          }
        ],
        customCategories: [],
        placementOverrides: {
          "kitchen-1": "used",
          "bedroom-1": "dock"
        }
      })
    );

    expect(result.current.categoryUsageCounts).toEqual({
      bedroom: 0,
      kitchen: 1
    });
    expect(result.current.hasCategoryWithoutPlannedVideo).toBe(true);
    expect(result.current.emptyRoomCount).toBe(1);
  });

  it("counts both truly empty rooms and zero-scene rooms in emptyRoomCount", () => {
    const { result } = renderHook(() =>
      usePlanDerivedState({
        images: [
          {
            id: "kitchen-1",
            url: "u1",
            filename: "kitchen-1.jpg",
            category: "kitchen",
            recommendationScore: 0.9
          }
        ],
        customCategories: ["bedroom"],
        placementOverrides: {
          "kitchen-1": "dock"
        }
      })
    );

    expect(result.current.hasEmptyCategory).toBe(true);
    expect(result.current.hasCategoryWithoutPlannedVideo).toBe(true);
    expect(result.current.emptyRoomCount).toBe(2);
  });

  it("includes empty custom room categories in the accordion order", () => {
    const { result } = renderHook(() =>
      usePlanDerivedState({
        images: [],
        customCategories: ["kitchen"]
      })
    );

    expect(result.current.categoryOrder).toEqual([
      "kitchen"
    ]);
    expect(result.current.accordionCategoryOrder).toEqual([
      "kitchen"
    ]);
    expect(result.current.hasEmptyCategory).toBe(true);
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

    expect(result.current.usedImageCount).toBe(8);
    expect(result.current.hasOverUsedLimit).toBe(false);
    expect(result.current.hasTooManyUsedImages).toBe(false);
    expect(result.current.isUsedImageCountValid).toBe(true);
    expect(
      Object.values(result.current.usedImagesByCategory).flatMap((roomImages) =>
        roomImages.map((image) => image.id)
      )
    ).toHaveLength(8);
    expect(result.current.dockedImages.map((image) => image.id)).toEqual([
      "img-4",
      "img-6",
      "img-8",
      "img-10",
      "img-12",
      "img-14"
    ]);
  });

  it("recommends all eligible images when only three are available", () => {
    const { result } = renderHook(() =>
      usePlanDerivedState({
        images: [
          {
            id: "kitchen",
            url: "u1",
            filename: "kitchen.jpg",
            category: "kitchen",
            recommendationScore: 0.4
          },
          {
            id: "living",
            url: "u2",
            filename: "living.jpg",
            category: "living-room",
            recommendationScore: 0.3
          },
          {
            id: "bath",
            url: "u3",
            filename: "bath.jpg",
            category: "bathroom",
            recommendationScore: 0.2
          }
        ],
        customCategories: []
      })
    );

    expect(result.current.usedImageCount).toBe(3);
    expect(
      Object.values(result.current.usedImagesByCategory).flatMap((roomImages) =>
        roomImages.map((image) => image.id)
      )
    ).toEqual(["kitchen", "living", "bath"]);
  });

  it("keeps weak listings at the minimum viable default of three images", () => {
    const { result } = renderHook(() =>
      usePlanDerivedState({
        images: [
          {
            id: "kitchen-1",
            url: "u1",
            filename: "k1.jpg",
            category: "kitchen",
            recommendationScore: 0.81
          },
          {
            id: "living-1",
            url: "u2",
            filename: "l1.jpg",
            category: "living-room",
            recommendationScore: 0.8
          },
          {
            id: "bed-1",
            url: "u3",
            filename: "b1.jpg",
            category: "bedroom",
            recommendationScore: 0.79
          },
          {
            id: "bath-1",
            url: "u4",
            filename: "ba1.jpg",
            category: "bathroom",
            recommendationScore: 0.76
          },
          {
            id: "office-1",
            url: "u5",
            filename: "o1.jpg",
            category: "office",
            recommendationScore: 0.74
          }
        ],
        customCategories: []
      })
    );

    const usedIds = Object.values(result.current.usedImagesByCategory).flatMap(
      (roomImages) => roomImages.map((image) => image.id)
    );

    expect(result.current.usedImageCount).toBe(3);
    expect(usedIds).toEqual(["kitchen-1", "living-1", "bed-1"]);
    expect(result.current.dockedImages.map((image) => image.id)).toEqual([
      "bath-1",
      "office-1"
    ]);
  });

  it("prioritizes room coverage before details and caps default detail recommendations", () => {
    const { result } = renderHook(() =>
      usePlanDerivedState({
        images: [
          {
            id: "kitchen-room",
            url: "u1",
            filename: "kitchen-room.jpg",
            category: "kitchen",
            recommendationScore: 0.94,
            shotType: "room"
          },
          {
            id: "living-room",
            url: "u2",
            filename: "living-room.jpg",
            category: "living-room",
            recommendationScore: 0.93,
            shotType: "room"
          },
          {
            id: "bedroom-room",
            url: "u3",
            filename: "bedroom-room.jpg",
            category: "bedroom",
            recommendationScore: 0.92,
            shotType: "room"
          },
          {
            id: "bath-room",
            url: "u4",
            filename: "bath-room.jpg",
            category: "bathroom",
            recommendationScore: 0.91,
            shotType: "room"
          },
          {
            id: "office-room",
            url: "u5",
            filename: "office-room.jpg",
            category: "office",
            recommendationScore: 0.9,
            shotType: "room"
          },
          {
            id: "garage-room",
            url: "u6",
            filename: "garage-room.jpg",
            category: "garage",
            recommendationScore: 0.89,
            shotType: "room"
          },
          {
            id: "kitchen-detail",
            url: "u7",
            filename: "kitchen-detail.jpg",
            category: "kitchen",
            recommendationScore: 0.99,
            shotType: "detail"
          },
          {
            id: "bath-detail",
            url: "u8",
            filename: "bath-detail.jpg",
            category: "bathroom",
            recommendationScore: 0.98,
            shotType: "detail"
          },
          {
            id: "living-detail",
            url: "u9",
            filename: "living-detail.jpg",
            category: "living-room",
            recommendationScore: 0.97,
            shotType: "detail"
          }
        ],
        customCategories: []
      })
    );

    const usedIds = Object.values(result.current.usedImagesByCategory).flatMap(
      (roomImages) => roomImages.map((image) => image.id)
    );
    const usedDetails = usedIds.filter((id) => id.includes("detail"));

    expect(result.current.usedImageCount).toBe(7);
    expect(usedIds).toEqual([
      "kitchen-room",
      "kitchen-detail",
      "living-room",
      "bedroom-room",
      "bath-room",
      "office-room",
      "garage-room"
    ]);
    expect(usedDetails).toEqual(["kitchen-detail"]);
    expect(result.current.dockedImages.map((image) => image.id)).toEqual([
      "bath-detail",
      "living-detail"
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

    expect(result.current.usedImageCount).toBe(8);
    expect(usedIds).toContain("new-high");
    expect(usedIds).not.toContain("existing-low");
    expect(result.current.dockedImages.map((image) => image.id)).toContain(
      "existing-low"
    );
  });

  it("reports an invalid continue state when selected images exceed the total video limit", () => {
    const images = Array.from({ length: 11 }, (_, index) => ({
      id: `img-${index + 1}`,
      url: `u${index + 1}`,
      filename: `img-${index + 1}.jpg`,
      category: `room-${index + 1}`,
      recommendationScore: 1 - index * 0.01
    }));

    const placementOverrides = Object.fromEntries(
      images.map((image) => [image.id, "used" as const])
    );

    const { result } = renderHook(() =>
      usePlanDerivedState({
        images,
        customCategories: [],
        placementOverrides
      })
    );

    expect(result.current.usedImageCount).toBe(11);
    expect(result.current.hasAnyUsedImages).toBe(true);
    expect(result.current.hasTooFewUsedImages).toBe(false);
    expect(result.current.hasTooManyUsedImages).toBe(true);
    expect(result.current.isUsedImageCountValid).toBe(false);
  });
});
