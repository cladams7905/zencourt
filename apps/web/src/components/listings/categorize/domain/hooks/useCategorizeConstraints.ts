import * as React from "react";
import { toast } from "sonner";
import {
  MAX_CATEGORIES,
  MAX_IMAGES_PER_ROOM
} from "@shared/utils/mediaUpload";
import type { ListingImageItem } from "@web/src/components/listings/categorize/shared";
import { UNCATEGORIZED_CATEGORY_ID } from "@web/src/components/listings/categorize/shared";
import { formatCategoryLabel } from "@web/src/components/listings/categorize/domain/categoryRules";

type UseCategorizeConstraintsParams = {
  images: ListingImageItem[];
  categoryOrder: string[];
  baseCategoryCounts: Record<string, number>;
  setImages: React.Dispatch<React.SetStateAction<ListingImageItem[]>>;
  persistImageAssignments: (
    updates: Array<{ id: string; category: string | null; isPrimary?: boolean }>,
    deletions: string[],
    rollback?: () => void
  ) => Promise<boolean>;
};

export function useCategorizeConstraints({
  images,
  categoryOrder,
  baseCategoryCounts,
  setImages,
  persistImageAssignments
}: UseCategorizeConstraintsParams) {
  React.useEffect(() => {
    const overflowIds = new Set<string>();
    const categoriesToToast: string[] = [];
    let didExceedCategoryLimit = false;

    const activeCategories = categoryOrder.filter(
      (category) => category !== UNCATEGORIZED_CATEGORY_ID
    );
    if (activeCategories.length > MAX_CATEGORIES) {
      const allowedCategories = new Set(
        activeCategories.slice(0, MAX_CATEGORIES)
      );
      activeCategories.forEach((category) => {
        if (allowedCategories.has(category)) {
          return;
        }
        const categoryImages = images.filter(
          (image) => image.category === category
        );
        categoryImages.forEach((image) => overflowIds.add(image.id));
      });
      didExceedCategoryLimit = true;
    }

    categoryOrder.forEach((category) => {
      if (category === UNCATEGORIZED_CATEGORY_ID) {
        return;
      }
      const categoryImages = images.filter(
        (image) => image.category === category
      );
      if (categoryImages.length <= MAX_IMAGES_PER_ROOM) {
        return;
      }
      const sorted = [...categoryImages].sort((a, b) => {
        const scoreA = a.primaryScore ?? -1;
        const scoreB = b.primaryScore ?? -1;
        return scoreB - scoreA;
      });
      const keepIds = new Set(
        sorted.slice(0, MAX_IMAGES_PER_ROOM).map((image) => image.id)
      );
      categoryImages.forEach((image) => {
        if (!keepIds.has(image.id)) {
          overflowIds.add(image.id);
        }
      });
      categoriesToToast.push(category);
    });

    if (overflowIds.size === 0) {
      return;
    }

    const previousImages = images;
    const updates = Array.from(overflowIds).map((id) => ({
      id,
      category: null,
      isPrimary: false
    }));
    const nextImages = images.map((image) =>
      overflowIds.has(image.id)
        ? { ...image, category: null, isPrimary: false }
        : image
    );

    setImages(nextImages);
    void persistImageAssignments(updates, [], () => setImages(previousImages));
    if (didExceedCategoryLimit) {
      toast.error(
        `This listing exceeds the maximum of ${MAX_CATEGORIES} categories. Extra images were moved to Uncategorized.`
      );
    }
    categoriesToToast.forEach((category) => {
      toast.error(
        `Too many images in ${formatCategoryLabel(
          category,
          baseCategoryCounts
        )}. Please recategorize or remove them.`
      );
    });
  }, [
    baseCategoryCounts,
    categoryOrder,
    images,
    persistImageAssignments,
    setImages
  ]);
}
