"use client";

import * as React from "react";
import type { ListingImagePreviewItem } from "@web/src/components/listings/create/shared/types";
import { useImagePreviewState } from "@web/src/components/listings/create/media/image/useImagePreviewState";
import { ImagePreviewCard } from "@web/src/components/listings/create/media/image/components/ImagePreviewCard";
import { ImagePreviewModal } from "@web/src/components/listings/create/media/image/components/ImagePreviewModal";
import { ImagePreviewSkeletonCard } from "@web/src/components/listings/create/media/image/components/ImagePreviewSkeletonCard";

type ListingImagePreviewGridProps = {
  items: ListingImagePreviewItem[];
  captionSubcategoryLabel: string;
  loadingCount?: number;
  onDeleteItem?: (contentItemId: string) => void;
};

export function ListingImagePreviewGrid({
  items,
  captionSubcategoryLabel,
  loadingCount = 0,
  onDeleteItem
}: ListingImagePreviewGridProps) {
  const {
    selectedItem,
    setSelectedItemId,
    activeSlideIndex,
    setActiveSlideIndex,
    cardSlideIndexById,
    setCardSlideIndexById
  } = useImagePreviewState(items);

  const skeletonCount = Math.max(0, loadingCount);

  if (items.length === 0 && skeletonCount === 0) {
    return null;
  }

  return (
    <>
      <div className="grid grid-cols-2 gap-2 md:grid-cols-3 md:gap-3 xl:grid-cols-3">
        {items.map((item) => (
          <ImagePreviewCard
            key={item.id}
            item={item}
            cardSlideIndex={cardSlideIndexById[item.id] ?? 0}
            onSelect={() => setSelectedItemId(item.id)}
            onPrevSlide={() =>
              setCardSlideIndexById((prev) => ({
                ...prev,
                [item.id]:
                  ((prev[item.id] ?? 0) - 1 + item.slides.length) %
                  item.slides.length
              }))
            }
            onNextSlide={() =>
              setCardSlideIndexById((prev) => ({
                ...prev,
                [item.id]: ((prev[item.id] ?? 0) + 1) % item.slides.length
              }))
            }
            onSelectSlide={(index) =>
              setCardSlideIndexById((prev) => ({
                ...prev,
                [item.id]: index
              }))
            }
            onDelete={
              onDeleteItem
                ? () => onDeleteItem(item.captionItemId ?? item.id)
                : undefined
            }
          />
        ))}
        {Array.from({ length: skeletonCount }, (_, i) => (
          <ImagePreviewSkeletonCard key={`skeleton-image-${i}`} />
        ))}
      </div>

      <ImagePreviewModal
        selectedItem={selectedItem}
        activeSlideIndex={activeSlideIndex}
        captionSubcategoryLabel={captionSubcategoryLabel}
        onOpenChange={(open) => {
          if (!open) {
            setSelectedItemId(null);
          }
        }}
        onPrevSlide={() =>
          setActiveSlideIndex(
            (prev) =>
              (prev - 1 + (selectedItem?.slides.length ?? 1)) %
              (selectedItem?.slides.length ?? 1)
          )
        }
        onNextSlide={() =>
          setActiveSlideIndex(
            (prev) => (prev + 1) % (selectedItem?.slides.length ?? 1)
          )
        }
        onSelectSlide={setActiveSlideIndex}
      />
    </>
  );
}
