import * as React from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@web/src/components/ui/button";
import { cn } from "@web/src/components/ui/utils";
import { LoadingImage } from "@web/src/components/ui/loading-image";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle
} from "@web/src/components/ui/dialog";
import type { ListingImagePreviewItem } from "@web/src/components/listings/create/shared/types";
import {
  buildImagePreviewOverlay,
  resolveItemTemplatePattern
} from "@web/src/components/listings/create/media/image/imagePreviewViewModel";
import { ImageTextOverlay } from "@web/src/components/listings/create/media/image/components/ImageTextOverlay";

type ImagePreviewModalProps = {
  selectedItem: ListingImagePreviewItem | null;
  activeSlideIndex: number;
  captionSubcategoryLabel: string;
  onOpenChange: (open: boolean) => void;
  onPrevSlide: () => void;
  onNextSlide: () => void;
  onSelectSlide: (index: number) => void;
};

export function ImagePreviewModal({
  selectedItem,
  activeSlideIndex,
  captionSubcategoryLabel,
  onOpenChange,
  onPrevSlide,
  onNextSlide,
  onSelectSlide
}: ImagePreviewModalProps) {
  const selectedSlides = selectedItem?.slides ?? [];
  const isTemplateRender = Boolean(selectedItem?.isTemplateRender);
  const selectedTemplatePattern =
    selectedItem && !isTemplateRender
      ? resolveItemTemplatePattern(selectedItem)
      : undefined;
  const selectedSlide = selectedSlides[activeSlideIndex] ?? null;
  const selectedOverlay =
    selectedItem && selectedSlide && !isTemplateRender
      ? buildImagePreviewOverlay(
          selectedItem.id,
          selectedSlide,
          selectedItem.variationNumber,
          selectedTemplatePattern
        )
      : null;

  return (
    <Dialog open={Boolean(selectedItem)} onOpenChange={onOpenChange}>
      <DialogContent className="h-[82vh] w-[94vw] max-w-[calc(100vw-1.5rem)] grid-rows-[auto_minmax(0,1fr)] overflow-hidden sm:h-[80vh] sm:w-[88vw] sm:max-w-[calc(100vw-2rem)] xl:w-[72vw] xl:max-w-[1600px]">
        <DialogHeader>
          <DialogTitle>Image Preview</DialogTitle>
        </DialogHeader>
        {selectedItem ? (
          <div className="grid h-full min-h-0 gap-4 lg:grid-cols-[minmax(0,1fr)_420px] lg:grid-rows-none lg:gap-6 xl:grid-cols-[minmax(0,1fr)_490px]">
            <div className="group relative mx-auto h-fit w-fit">
              <div className="relative aspect-square w-[min(72vh,88vw)] max-w-[420px] overflow-hidden rounded-lg bg-card">
                {selectedSlide?.imageUrl ? (
                  <LoadingImage
                    src={selectedSlide.imageUrl}
                    alt="Listing image preview"
                    fill
                    className="object-contain"
                  />
                ) : null}
                {selectedOverlay ? (
                  <>
                    <div className="pointer-events-none absolute inset-0 bg-linear-to-b from-black/35 via-black/15 to-black/40" />
                    <ImageTextOverlay overlay={selectedOverlay} />
                  </>
                ) : null}
              </div>
              {selectedSlides.length > 1 ? (
                <>
                  <Button
                    type="button"
                    size="icon"
                    variant="ghost"
                    className="absolute left-3 top-1/2 h-6 w-6 -translate-y-1/2 rounded-full border border-white/35 bg-white/20 text-white/90 opacity-100 transition-opacity duration-200 hover:bg-white/30 sm:left-5 sm:opacity-0 sm:group-hover:opacity-100"
                    onClick={onPrevSlide}
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <Button
                    type="button"
                    size="icon"
                    variant="ghost"
                    className="absolute right-3 top-1/2 h-6 w-6 -translate-y-1/2 rounded-full border border-white/35 bg-white/20 text-white/90 opacity-100 transition-opacity duration-200 hover:bg-white/30 sm:right-5 sm:opacity-0 sm:group-hover:opacity-100"
                    onClick={onNextSlide}
                  >
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                  <div className="absolute inset-x-0 bottom-6 flex items-center justify-center gap-1.5">
                    {selectedSlides.map((slide, index) => (
                      <button
                        key={`${slide.id}-modal-dot`}
                        type="button"
                        className={cn(
                          "h-1.5 w-1.5 rounded-full border border-white/60 transition-all",
                          index === activeSlideIndex
                            ? "bg-white"
                            : "bg-white/35 hover:bg-white/70"
                        )}
                        onClick={() => onSelectSlide(index)}
                        aria-label={`View slide ${index + 1}`}
                      />
                    ))}
                  </div>
                </>
              ) : null}
            </div>
            <div className="min-h-0 overflow-y-auto rounded-lg border border-border bg-card p-3 sm:p-4">
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                {captionSubcategoryLabel} Caption · Variation{" "}
                {selectedItem.variationNumber}
              </p>
              <div className="mt-4 space-y-4">
                {selectedItem.hook ? (
                  <div>
                    <p className="text-xs font-semibold text-muted-foreground">
                      Hook
                    </p>
                    <p className="text-sm text-foreground">
                      {selectedItem.hook}
                    </p>
                  </div>
                ) : null}
                <div>
                  <p className="text-xs font-semibold text-muted-foreground">
                    Caption
                  </p>
                  <p className="mt-1 whitespace-pre-line text-sm text-foreground">
                    {selectedItem.caption?.trim()
                      ? selectedItem.caption
                      : "No caption available yet for this subcategory."}
                  </p>
                </div>
                {selectedSlides.length > 1 ? (
                  <p className="text-xs text-muted-foreground">
                    Slide {activeSlideIndex + 1} of {selectedSlides.length}
                  </p>
                ) : null}
              </div>
            </div>
          </div>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
