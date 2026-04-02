import * as React from "react";
import { MAX_CATEGORIES, MAX_IMAGES_PER_ROOM } from "@shared/utils/mediaUpload";
import type {
  ListingImageItem,
  WorkspacePlacement
} from "@web/src/components/listings/stage/categorize/shared/types";
import { getCategoryBase } from "@web/src/components/listings/stage/categorize/domain/categoryRules";
import {
  CATEGORIZE_MAX_USED_PHOTOS,
  UNCATEGORIZED_CATEGORY_ID
} from "@web/src/components/listings/stage/categorize/shared/constants";

type UseCategorizeDerivedStateParams = {
  images: ListingImageItem[];
  customCategories: string[];
  placementOverrides?: Record<string, WorkspacePlacement>;
};

const DEFAULT_USED_IMAGES_PER_CATEGORY = 2;

const getScore = (image: ListingImageItem) => image.recommendationScore ?? -1;
const sortByRecommendationScore = (a: ListingImageItem, b: ListingImageItem) =>
  getScore(b) - getScore(a);

export function useCategorizeDerivedState({
  images,
  customCategories,
  placementOverrides = {}
}: UseCategorizeDerivedStateParams) {
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
        (category) => (categorizedImages[category]?.length ?? 0) > 0
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
    const ids = new Set<string>();
    workspaceCategoryOrder.forEach((category) => {
      const ranked = [...(categorizedImages[category] ?? [])].sort(
        sortByRecommendationScore
      );
      ranked
        .slice(0, DEFAULT_USED_IMAGES_PER_CATEGORY)
        .forEach((image) => ids.add(image.id));
    });
    return ids;
  }, [categorizedImages, workspaceCategoryOrder]);

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
        const workspacePlacement: WorkspacePlacement =
          canBeUsed && override === "used"
            ? "used"
            : override === "dock"
              ? "dock"
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
    [defaultUsedImageIds, images, placementOverrides, workspaceCategoryOrder]
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
        acc[image.category].sort(sortByRecommendationScore);
        return acc;
      }, {}),
    [workspaceImages]
  );

  /** Room accordions only when at least one image is selected as a video frame. */
  const accordionCategoryOrder = React.useMemo(
    () =>
      workspaceCategoryOrder.filter(
        (category) => (usedImagesByCategory[category]?.length ?? 0) > 0
      ),
    [usedImagesByCategory, workspaceCategoryOrder]
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
  const activeCategoryCount = workspaceCategoryOrder.length;
  const hasTooManyCategories = activeCategoryCount > MAX_CATEGORIES;
  const categoriesOverUsedLimit = workspaceCategoryOrder.filter(
    (category) => (categoryUsageCounts[category] ?? 0) > MAX_IMAGES_PER_ROOM
  );
  const hasOverLimit = categoriesOverUsedLimit.length > 0;
  const usedImageCount = Object.values(categoryUsageCounts).reduce(
    (sum, count) => sum + count,
    0
  );
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
    categoriesOverUsedLimit,
    usedImageCount,
    hasOverUsedLimit,
    maxUsedImagesTotal: CATEGORIZE_MAX_USED_PHOTOS,
    defaultUsedImagesPerCategory: DEFAULT_USED_IMAGES_PER_CATEGORY,
    uncategorizedDockCount,
    hasUncategorized,
    hasEmptyCategory,
    hasTooManyCategories,
    hasOverLimit
  };
}
