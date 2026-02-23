import * as React from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@web/src/components/ui/button";
import { LoadingImage } from "@web/src/components/ui/loading-image";
import { cn } from "@web/src/components/ui/utils";
import type { ListingImagePreviewItem } from "@web/src/components/listings/create/shared/types";
import {
  buildImagePreviewOverlay,
  resolveItemTemplatePattern
} from "@web/src/components/listings/create/media/image/imagePreviewViewModel";
import { ImageTextOverlay } from "@web/src/components/listings/create/media/image/components/ImageTextOverlay";

type ImagePreviewCardProps = {
  item: ListingImagePreviewItem;
  cardSlideIndex: number;
  onSelect: () => void;
  onPrevSlide: () => void;
  onNextSlide: () => void;
  onSelectSlide: (index: number) => void;
};

export function ImagePreviewCard({
  item,
  cardSlideIndex,
  onSelect,
  onPrevSlide,
  onNextSlide,
  onSelectSlide
}: ImagePreviewCardProps) {
  const isTemplateRender = Boolean(item.isTemplateRender);
  const itemTemplatePattern = isTemplateRender
    ? undefined
    : resolveItemTemplatePattern(item);
  const normalizedCardSlideIndex =
    item.slides.length > 0
      ? ((cardSlideIndex % item.slides.length) + item.slides.length) %
        item.slides.length
      : 0;
  const coverSlide = item.slides[normalizedCardSlideIndex] ?? null;
  const coverOverlay =
    isTemplateRender || !coverSlide
      ? null
      : buildImagePreviewOverlay(
          item.id,
          coverSlide,
          item.variationNumber,
          itemTemplatePattern
        );
  const coverImage = coverSlide?.imageUrl ?? item.coverImageUrl ?? null;
  const hasOverlay = !isTemplateRender && Boolean(coverOverlay);

  return (
    <div
      role="button"
      tabIndex={0}
      className="group overflow-hidden rounded-xl bg-card shadow-sm text-left"
      onClick={onSelect}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          onSelect();
        }
      }}
    >
      <div className="relative aspect-square w-full overflow-hidden bg-card">
        {coverImage ? (
          <LoadingImage
            src={coverImage}
            alt="Listing image preview"
            fill
            sizes="(min-width: 1024px) 24vw, (min-width: 768px) 32vw, 100vw"
            className="object-cover transition-transform duration-700 group-hover:scale-105"
          />
        ) : null}
        {hasOverlay ? (
          <div className="pointer-events-none absolute inset-0 bg-linear-to-b from-black/35 via-black/15 to-black/40" />
        ) : null}
        {coverOverlay ? <ImageTextOverlay overlay={coverOverlay} /> : null}
        {item.slides.length > 1 ? (
          <div className="absolute inset-x-0 top-1/2 flex -translate-y-1/2 items-center justify-between px-2 opacity-0 transition-opacity duration-200 group-hover:opacity-100">
            <Button
              type="button"
              size="icon"
              variant="ghost"
              className="h-6 w-6 rounded-full border border-white/35 bg-white/20 text-white/90 hover:bg-white/30"
              onClick={(event) => {
                event.preventDefault();
                event.stopPropagation();
                onPrevSlide();
              }}
              aria-label="Previous slide"
            >
              <ChevronLeft className="h-3.5 w-3.5" />
            </Button>
            <Button
              type="button"
              size="icon"
              variant="ghost"
              className="h-6 w-6 rounded-full border border-white/35 bg-white/20 text-white/90 hover:bg-white/30"
              onClick={(event) => {
                event.preventDefault();
                event.stopPropagation();
                onNextSlide();
              }}
              aria-label="Next slide"
            >
              <ChevronRight className="h-3.5 w-3.5" />
            </Button>
          </div>
        ) : null}
        {item.slides.length > 1 ? (
          <div className="absolute inset-x-0 bottom-2 flex items-center justify-center gap-1.5">
            {item.slides.map((slide, index) => (
              <button
                key={`${slide.id}-dot`}
                type="button"
                className={cn(
                  "h-1.5 w-1.5 rounded-full border border-white/60 transition-all",
                  index === normalizedCardSlideIndex
                    ? "bg-white"
                    : "bg-white/35 hover:bg-white/70"
                )}
                onClick={(event) => {
                  event.preventDefault();
                  event.stopPropagation();
                  onSelectSlide(index);
                }}
                aria-label={`View slide ${index + 1}`}
              />
            ))}
          </div>
        ) : null}
      </div>
    </div>
  );
}
