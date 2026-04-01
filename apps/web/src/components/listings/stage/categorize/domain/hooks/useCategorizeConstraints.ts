import * as React from "react";
import { toast } from "sonner";
import { MAX_CATEGORIES } from "@shared/utils/mediaUpload";
import { UNCATEGORIZED_CATEGORY_ID } from "@web/src/components/listings/stage/categorize/shared";

type UseCategorizeConstraintsParams = {
  categoryOrder: string[];
};

export function useCategorizeConstraints({
  categoryOrder
}: UseCategorizeConstraintsParams) {
  const hasWarnedTooManyCategoriesRef = React.useRef(false);

  React.useEffect(() => {
    const activeCategories = categoryOrder.filter(
      (category) => category !== UNCATEGORIZED_CATEGORY_ID && category !== "other"
    );

    if (activeCategories.length > MAX_CATEGORIES) {
      if (!hasWarnedTooManyCategoriesRef.current) {
        hasWarnedTooManyCategoriesRef.current = true;
        toast.error(
          `This listing exceeds the maximum of ${MAX_CATEGORIES} categories.`
        );
      }
      return;
    }

    hasWarnedTooManyCategoriesRef.current = false;
  }, [categoryOrder]);
}
