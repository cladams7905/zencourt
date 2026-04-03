import * as React from "react";
import { MAX_CATEGORIES } from "@shared/utils/mediaUpload";
import type {
  ListingImageItem,
  WorkspacePlacement
} from "@web/src/components/listings/stage/plan/shared/types";
import { getCategoryBase } from "@web/src/components/listings/stage/plan/domain/categoryRules";
import {
  CATEGORIZE_MAX_USED_PHOTOS,
  DEFAULT_RECOMMENDED_MAX_USED_PHOTOS,
  DEFAULT_RECOMMENDED_MIN_USED_PHOTOS,
  DEFAULT_RECOMMENDED_TARGET_USED_PHOTOS,
  UNCATEGORIZED_CATEGORY_ID
} from "@web/src/components/listings/stage/plan/shared/constants";

type UsePlanDerivedStateParams = {
  images: ListingImageItem[];
  customCategories: string[];
  placementOverrides?: Record<string, WorkspacePlacement>;
  ignorePersistedSceneSelection?: boolean;
};

const DEFAULT_USED_IMAGES_PER_CATEGORY = 1;
const DEFAULT_RECOMMENDATION_FLOORS = [0.88, 0.85, 0.82, 0.79, 0.76, 0.72];
const DEFAULT_STRETCH_FLOOR = 0.88;
const DEFAULT_STRONG_DETAIL_FLOOR = 0.95;
const DEFAULT_DETAIL_RECOMMENDATION_CAP = 1;

const getScore = (image: ListingImageItem) => image.recommendationScore ?? -1;
const sortByRecommendationScore = (a: ListingImageItem, b: ListingImageItem) =>
  getScore(b) - getScore(a);

function resolveRecommendationFloor(
  images: ListingImageItem[],
  minimumTarget: number
): number | null {
  for (const floor of DEFAULT_RECOMMENDATION_FLOORS) {
    if (images.filter((image) => getScore(image) >= floor).length >= minimumTarget) {
      return floor;
    }
  }

  return null;
}

function addCandidates(args: {
  candidates: ListingImageItem[];
  limit: number;
  selectedIds: Set<string>;
  selectedCountsByCategory: Record<string, number>;
  preferUnusedCategories?: boolean;
  maxPerCategory?: number;
}): void {
  const {
    candidates,
    limit,
    selectedIds,
    selectedCountsByCategory,
    preferUnusedCategories = false,
    maxPerCategory
  } = args;

  candidates.forEach((image) => {
    const category = image.category;
    if (!category || selectedIds.size >= limit || selectedIds.has(image.id)) {
      return;
    }

    const categoryCount = selectedCountsByCategory[category] ?? 0;
    if (preferUnusedCategories && categoryCount > 0) {
      return;
    }
    if (maxPerCategory !== undefined && categoryCount >= maxPerCategory) {
      return;
    }

    selectedIds.add(image.id);
    selectedCountsByCategory[category] = categoryCount + 1;
  });
}

function addDetailCandidates(args: {
  candidates: ListingImageItem[];
  limit: number;
  selectedIds: Set<string>;
  maxDetails: number;
}): void {
  const { candidates, limit, selectedIds, maxDetails } = args;
  let selectedDetailCount = candidates.filter((image) => selectedIds.has(image.id)).length;

  candidates.forEach((image) => {
    if (
      selectedIds.size >= limit ||
      selectedIds.has(image.id) ||
      selectedDetailCount >= maxDetails
    ) {
      return;
    }

    selectedIds.add(image.id);
    selectedDetailCount += 1;
  });
}

function buildDefaultUsedImageIds(args: {
  categorizedImages: Record<string, ListingImageItem[]>;
  workspaceCategoryOrder: string[];
}): Set<string> {
  const { categorizedImages, workspaceCategoryOrder } = args;
  const eligibleImages = workspaceCategoryOrder
    .flatMap((category) => categorizedImages[category] ?? [])
    .filter((image) => Boolean(image.category) && image.category !== "other")
    .sort(sortByRecommendationScore);

  if (eligibleImages.length <= DEFAULT_RECOMMENDED_MIN_USED_PHOTOS) {
    return new Set(eligibleImages.map((image) => image.id));
  }

  const selectedIds = new Set<string>();
  const selectedCountsByCategory: Record<string, number> = {};
  const roomCandidates = eligibleImages.filter((image) => image.shotType !== "detail");
  const detailCandidates = eligibleImages.filter(
    (image) => image.shotType === "detail"
  );
  const minimumRecommendationCount = Math.min(
    DEFAULT_RECOMMENDED_MIN_USED_PHOTOS,
    eligibleImages.length
  );
  const dynamicFloor =
    resolveRecommendationFloor(
      eligibleImages,
      DEFAULT_RECOMMENDED_TARGET_USED_PHOTOS
    ) ??
    resolveRecommendationFloor(eligibleImages, minimumRecommendationCount);
  const qualifiedRoomCandidates =
    dynamicFloor === null
      ? roomCandidates
      : roomCandidates.filter((image) => getScore(image) >= dynamicFloor);
  const stretchRoomCandidates = roomCandidates.filter(
    (image) => getScore(image) >= DEFAULT_STRETCH_FLOOR
  );
  const strongDetailCandidates = detailCandidates.filter(
    (image) => getScore(image) >= DEFAULT_STRONG_DETAIL_FLOOR
  );

  addCandidates({
    candidates: qualifiedRoomCandidates,
    limit: DEFAULT_RECOMMENDED_TARGET_USED_PHOTOS,
    selectedIds,
    selectedCountsByCategory,
    preferUnusedCategories: true,
    maxPerCategory: DEFAULT_USED_IMAGES_PER_CATEGORY
  });
  addCandidates({
    candidates: qualifiedRoomCandidates,
    limit: DEFAULT_RECOMMENDED_TARGET_USED_PHOTOS,
    selectedIds,
    selectedCountsByCategory
  });

  addCandidates({
    candidates: roomCandidates,
    limit: minimumRecommendationCount,
    selectedIds,
    selectedCountsByCategory,
    preferUnusedCategories: true,
    maxPerCategory: DEFAULT_USED_IMAGES_PER_CATEGORY
  });
  addCandidates({
    candidates: detailCandidates,
    limit: minimumRecommendationCount,
    selectedIds,
    selectedCountsByCategory,
    preferUnusedCategories: true,
    maxPerCategory: minimumRecommendationCount
  });
  addCandidates({
    candidates: roomCandidates,
    limit: minimumRecommendationCount,
    selectedIds,
    selectedCountsByCategory
  });
  addDetailCandidates({
    candidates: detailCandidates,
    limit: minimumRecommendationCount,
    selectedIds,
    maxDetails: minimumRecommendationCount
  });

  addCandidates({
    candidates: stretchRoomCandidates,
    limit: DEFAULT_RECOMMENDED_MAX_USED_PHOTOS,
    selectedIds,
    selectedCountsByCategory,
    preferUnusedCategories: true,
    maxPerCategory: DEFAULT_USED_IMAGES_PER_CATEGORY
  });
  addDetailCandidates({
    candidates: strongDetailCandidates,
    limit: DEFAULT_RECOMMENDED_MAX_USED_PHOTOS,
    selectedIds,
    maxDetails: DEFAULT_DETAIL_RECOMMENDATION_CAP
  });
  addCandidates({
    candidates: stretchRoomCandidates,
    limit: DEFAULT_RECOMMENDED_MAX_USED_PHOTOS,
    selectedIds,
    selectedCountsByCategory
  });

  return selectedIds;
}

function hasPersistedVideoSceneSelection(image: ListingImageItem): boolean {
  return typeof image.metadata?.videoScene?.selected === "boolean";
}

export function usePlanDerivedState({
  images,
  customCategories,
  placementOverrides = {},
  ignorePersistedSceneSelection = false
}: UsePlanDerivedStateParams) {
  const categorizedImages = React.useMemo(
    () =>
      images.reduce<Record<string, ListingImageItem[]>>((acc, image) => {
        const key = image.category ?? UNCATEGORIZED_CATEGORY_ID;
        if (!acc[key]) {
          acc[key] = [];
        }
        acc[key].push(image);
        return acc;
      }, {}),
    [images]
  );

  const categoryOrder = React.useMemo(() => {
    const keys = new Set([...Object.keys(categorizedImages), ...customCategories]);
    return Array.from(keys).sort((a, b) => {
      if (a === UNCATEGORIZED_CATEGORY_ID) return -1;
      if (b === UNCATEGORIZED_CATEGORY_ID) return 1;
      return a.localeCompare(b);
    });
  }, [categorizedImages, customCategories]);

  /**
   * Categories that participate in workspace placement (≥1 photo). Drives
   * canBeUsed, default “used” picks, and drop-zone bookkeeping.
   */
  const workspaceCategoryOrder = React.useMemo(
    () =>
      categoryOrder.filter(
        (category) =>
          category !== "other" && (categorizedImages[category]?.length ?? 0) > 0
      ),
    [categoryOrder, categorizedImages]
  );

  const baseCategoryCounts = React.useMemo(() => {
    const counts: Record<string, number> = {};
    categoryOrder.forEach((category) => {
      if (category === UNCATEGORIZED_CATEGORY_ID || category === "other") {
        return;
      }
      const base = getCategoryBase(category);
      counts[base] = (counts[base] ?? 0) + 1;
    });
    return counts;
  }, [categoryOrder]);

  const defaultUsedImageIds = React.useMemo(() => {
    return buildDefaultUsedImageIds({
      categorizedImages,
      workspaceCategoryOrder
    });
  }, [categorizedImages, workspaceCategoryOrder]);

  const categoriesWithPersistedSceneSelection = React.useMemo(() => {
    if (ignorePersistedSceneSelection) {
      return new Set<string>();
    }

    const selectedCategories = new Set<string>();

    workspaceCategoryOrder.forEach((category) => {
      const roomImages = categorizedImages[category] ?? [];
      if (roomImages.some(hasPersistedVideoSceneSelection)) {
        selectedCategories.add(category);
      }
    });

    return selectedCategories;
  }, [categorizedImages, ignorePersistedSceneSelection, workspaceCategoryOrder]);

  const workspaceImages = React.useMemo(
    () =>
      images.map((image) => {
        const isOther = image.category === "other";
        const isUncategorized = !image.category;
        const isDetail = image.shotType === "detail";
        const canBeUsed =
          !isOther &&
          !isUncategorized &&
          workspaceCategoryOrder.includes(image.category ?? "");
        const override = placementOverrides[image.id];
        const hasPersistedSelectionForCategory =
          !!image.category &&
          categoriesWithPersistedSceneSelection.has(image.category);
        const persistedSelected = image.metadata?.videoScene?.selected;
        const workspacePlacement: WorkspacePlacement =
          canBeUsed && override === "used"
            ? "used"
            : override === "dock"
              ? "dock"
              : canBeUsed && hasPersistedSelectionForCategory
                ? persistedSelected
                  ? "used"
                  : "dock"
                : canBeUsed && defaultUsedImageIds.has(image.id)
                  ? "used"
                  : "dock";

        return {
          ...image,
          workspacePlacement,
          isOther,
          isUncategorized,
          isDetail
        };
      }),
    [
      categoriesWithPersistedSceneSelection,
      defaultUsedImageIds,
      images,
      placementOverrides,
      workspaceCategoryOrder
    ]
  );

  const usedImagesByCategory = React.useMemo(
    () =>
      workspaceImages.reduce<Record<string, ListingImageItem[]>>((acc, image) => {
        if (
          image.workspacePlacement !== "used" ||
          !image.category ||
          image.isOther
        ) {
          return acc;
        }
        if (!acc[image.category]) {
          acc[image.category] = [];
        }
        acc[image.category].push(image);
        return acc;
      }, {}),
    [workspaceImages]
  );

  const accordionCategoryOrder = React.useMemo(
    () =>
      categoryOrder.filter(
        (category) =>
          category !== UNCATEGORIZED_CATEGORY_ID && category !== "other"
      ),
    [categoryOrder]
  );

  const dockedImages = React.useMemo(
    () =>
      workspaceImages
        .filter((image) => image.workspacePlacement !== "used")
        .sort(sortByRecommendationScore),
    [workspaceImages]
  );

  const dockedImagesByCategory = React.useMemo(() => {
    const buckets: Record<string, ListingImageItem[]> = {};
    workspaceCategoryOrder.forEach((category) => {
      buckets[category] = [];
    });
    workspaceImages.forEach((image) => {
      if (image.workspacePlacement === "used") {
        return;
      }
      const key = image.category ?? UNCATEGORIZED_CATEGORY_ID;
      if (!buckets[key]) {
        return;
      }
      buckets[key].push(image);
    });
    workspaceCategoryOrder.forEach((category) => {
      buckets[category]?.sort(sortByRecommendationScore);
    });
    return buckets;
  }, [workspaceCategoryOrder, workspaceImages]);

  const categoryUsageCounts = React.useMemo(
    () =>
      workspaceCategoryOrder.reduce<Record<string, number>>((acc, category) => {
        acc[category] = usedImagesByCategory[category]?.length ?? 0;
        return acc;
      }, {}),
    [usedImagesByCategory, workspaceCategoryOrder]
  );

  const hasUncategorized = images.some((image) => !image.category);
  const uncategorizedDockCount = dockedImages.filter(
    (image) => image.isUncategorized
  ).length;
  const hasEmptyCategory = categoryOrder.some(
    (category) => (categorizedImages[category]?.length ?? 0) === 0
  );
  const emptyCategoryCount = categoryOrder.filter(
    (category) => (categorizedImages[category]?.length ?? 0) === 0
  ).length;
  const hasCategoryWithoutPlannedVideo = workspaceCategoryOrder.some(
    (category) =>
      category !== UNCATEGORIZED_CATEGORY_ID &&
      (categorizedImages[category]?.length ?? 0) > 0 &&
      (categoryUsageCounts[category] ?? 0) === 0
  );
  const categoriesWithoutPlannedVideoCount = workspaceCategoryOrder.filter(
    (category) =>
      category !== UNCATEGORIZED_CATEGORY_ID &&
      (categorizedImages[category]?.length ?? 0) > 0 &&
      (categoryUsageCounts[category] ?? 0) === 0
  ).length;
  const emptyRoomCount =
    emptyCategoryCount + categoriesWithoutPlannedVideoCount;
  const activeCategoryCount = workspaceCategoryOrder.length;
  const hasTooManyCategories = activeCategoryCount > MAX_CATEGORIES;
  const usedImageCount = Object.values(categoryUsageCounts).reduce(
    (sum, count) => sum + count,
    0
  );
  const hasAnyUsedImages = usedImageCount > 0;
  const hasTooFewUsedImages = usedImageCount < 1;
  const hasTooManyUsedImages = usedImageCount > CATEGORIZE_MAX_USED_PHOTOS;
  const isUsedImageCountValid =
    !hasTooFewUsedImages && !hasTooManyUsedImages;
  const hasOverUsedLimit = usedImageCount > CATEGORIZE_MAX_USED_PHOTOS;

  return {
    categorizedImages,
    workspaceImages,
    categoryOrder,
    workspaceCategoryOrder,
    accordionCategoryOrder,
    baseCategoryCounts,
    usedImagesByCategory,
    dockedImages,
    dockedImagesByCategory,
    categoryUsageCounts,
    usedImageCount,
    hasAnyUsedImages,
    hasTooFewUsedImages,
    hasTooManyUsedImages,
    isUsedImageCountValid,
    hasOverUsedLimit,
    maxUsedImagesTotal: CATEGORIZE_MAX_USED_PHOTOS,
    defaultUsedImagesPerCategory: DEFAULT_USED_IMAGES_PER_CATEGORY,
    uncategorizedDockCount,
    hasUncategorized,
    hasEmptyCategory,
    emptyRoomCount,
    hasCategoryWithoutPlannedVideo,
    hasTooManyCategories,
  };
}
