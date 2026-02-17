import * as React from "react";
import type { ListingImagePreviewItem } from "@web/src/components/listings/create/shared/types";

export function useImagePreviewState(items: ListingImagePreviewItem[]) {
  const [selectedItemId, setSelectedItemId] = React.useState<string | null>(null);
  const [activeSlideIndex, setActiveSlideIndex] = React.useState(0);
  const [cardSlideIndexById, setCardSlideIndexById] = React.useState<
    Record<string, number>
  >({});

  const selectedItem = React.useMemo(
    () => items.find((item) => item.id === selectedItemId) ?? null,
    [items, selectedItemId]
  );

  React.useEffect(() => {
    setActiveSlideIndex(0);
  }, [selectedItemId]);

  return {
    selectedItem,
    selectedItemId,
    setSelectedItemId,
    activeSlideIndex,
    setActiveSlideIndex,
    cardSlideIndexById,
    setCardSlideIndexById
  };
}
