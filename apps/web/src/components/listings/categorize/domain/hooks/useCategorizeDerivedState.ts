import * as React from "react";
import {
  MAX_CATEGORIES,
  MAX_IMAGES_PER_ROOM
} from "@shared/utils/mediaUpload";
import type { ListingImageItem } from "@web/src/components/listings/categorize/shared/types";
import { getCategoryBase } from "@web/src/components/listings/categorize/domain/categoryRules";
import { UNCATEGORIZED_CATEGORY_ID } from "@web/src/components/listings/categorize/shared/constants";

type UseCategorizeDerivedStateParams = {
  images: ListingImageItem[];
  customCategories: string[];
};

export function useCategorizeDerivedState({
  images,
  customCategories
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

  const baseCategoryCounts = React.useMemo(() => {
    const counts: Record<string, number> = {};
    categoryOrder.forEach((category) => {
      if (category === UNCATEGORIZED_CATEGORY_ID) {
        return;
      }
      const base = getCategoryBase(category);
      counts[base] = (counts[base] ?? 0) + 1;
    });
    return counts;
  }, [categoryOrder]);

  const hasUncategorized = images.some((image) => !image.category);
  const hasEmptyCategory = categoryOrder.some(
    (category) => (categorizedImages[category]?.length ?? 0) === 0
  );
  const activeCategoryCount = categoryOrder.filter(
    (category) => category !== UNCATEGORIZED_CATEGORY_ID
  ).length;
  const hasTooManyCategories = activeCategoryCount > MAX_CATEGORIES;
  const hasOverLimit = categoryOrder.some((category) => {
    if (category === UNCATEGORIZED_CATEGORY_ID) {
      return false;
    }
    return (categorizedImages[category]?.length ?? 0) > MAX_IMAGES_PER_ROOM;
  });

  return {
    categorizedImages,
    categoryOrder,
    baseCategoryCounts,
    hasUncategorized,
    hasEmptyCategory,
    hasTooManyCategories,
    hasOverLimit
  };
}
