"use client";

import * as React from "react";
import { ChevronLeft, ChevronRight, Loader2 } from "lucide-react";
import { LoadingImage } from "../../ui/loading-image";
import { Button } from "../../ui/button";
import { cn } from "../../ui/utils";
import type { TextOverlayInput } from "../../dashboard/ContentGrid";
import type { PreviewTextOverlay } from "@web/src/lib/video/previewTimeline";
import type { OverlayTemplatePattern } from "@shared/types/video";
import {
  buildOverlayTemplateLines,
  computeOverlayLineStyles,
  overlayPxToCqw,
  pickSandwichOverlayArrowPath,
  pickPreviewTextOverlayVariant,
  PREVIEW_TEXT_OVERLAY_BACKGROUND_COLOR,
  PREVIEW_TEXT_OVERLAY_BACKGROUND_COLOR_OPAQUE,
  PREVIEW_TEXT_OVERLAY_BORDER_RADIUS,
  PREVIEW_TEXT_OVERLAY_MAX_WIDTH,
  PREVIEW_TEXT_OVERLAY_POSITION_TOP,
  PREVIEW_TEXT_OVERLAY_TEXT_COLOR
} from "@shared/utils";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle
} from "../../ui/dialog";

export type ListingImagePreviewSlide = {
  id: string;
  imageUrl: string | null;
  header: string;
  content: string;
  textOverlay?: TextOverlayInput | null;
};

export type ListingImagePreviewItem = {
  id: string;
  variationNumber: number;
  hook: string | null;
  caption: string | null;
  slides: ListingImagePreviewSlide[];
  coverImageUrl: string | null;
};

type ListingImagePreviewGridProps = {
  items: ListingImagePreviewItem[];
  captionSubcategoryLabel: string;
  loadingCount?: number;
};

const IMAGE_OVERLAY_BASE_FONT_SIZE_PX = 38;
const IMAGE_OVERLAY_HORIZONTAL_PADDING_PX = 40;
const IMAGE_OVERLAY_BOX_PADDING_VERTICAL_PX = 10;
const IMAGE_OVERLAY_BOX_PADDING_HORIZONTAL_PX = 16;

function resolveItemTemplatePattern(
  item: ListingImagePreviewItem
): Exclude<OverlayTemplatePattern, "simple"> {
  const slides = item.slides ?? [];
  if (slides.length === 0) {
    return "sandwich";
  }

  const withBothAccents = slides.find(
    (slide) =>
      Boolean(slide.textOverlay?.accent_top?.trim()) &&
      Boolean(slide.textOverlay?.accent_bottom?.trim())
  );
  if (withBothAccents) {
    return "sandwich";
  }

  return "accent-headline";
}

function buildPreviewOverlay(
  itemId: string,
  slide: ListingImagePreviewSlide,
  slideIndex: number,
  patternOverride?: Exclude<OverlayTemplatePattern, "simple">
): PreviewTextOverlay | null {
  const plainText = slide.header?.trim();
  if (!plainText && !slide.textOverlay?.headline?.trim()) {
    return null;
  }
  const variant = pickPreviewTextOverlayVariant(`${itemId}-${slideIndex}`);
  const { pattern, lines } = buildOverlayTemplateLines(
    slide.textOverlay,
    plainText || slide.textOverlay?.headline || "",
    patternOverride
  );

  return {
    text: plainText || slide.textOverlay?.headline || "",
    position: pattern === "simple" ? variant.position : "center",
    background: pattern === "simple" ? variant.background : "none",
    font: variant.font,
    templatePattern: pattern,
    lines,
    fontPairing: variant.fontPairing
  };
}

function ImageTextOverlay({ overlay }: { overlay: PreviewTextOverlay }) {
  const hasBackground = overlay.background !== "none";
  const backgroundColor =
    overlay.templatePattern === "simple"
      ? PREVIEW_TEXT_OVERLAY_BACKGROUND_COLOR_OPAQUE[overlay.background]
      : PREVIEW_TEXT_OVERLAY_BACKGROUND_COLOR[overlay.background];
  const lineStyles = computeOverlayLineStyles(
    overlay,
    IMAGE_OVERLAY_BASE_FONT_SIZE_PX
  );
  const arrowPath = pickSandwichOverlayArrowPath(overlay);

  return (
    <div
      className="pointer-events-none absolute inset-0 overflow-hidden"
      style={{ containerType: "inline-size" }}
    >
      <div
        className="absolute left-0 right-0 flex justify-center px-4"
        style={{
          top: PREVIEW_TEXT_OVERLAY_POSITION_TOP[overlay.position],
          paddingLeft: overlayPxToCqw(IMAGE_OVERLAY_HORIZONTAL_PADDING_PX),
          paddingRight: overlayPxToCqw(IMAGE_OVERLAY_HORIZONTAL_PADDING_PX),
          transform:
            overlay.position === "center" ? "translateY(-50%)" : undefined
        }}
      >
        <div
          style={{
            maxWidth: PREVIEW_TEXT_OVERLAY_MAX_WIDTH,
            borderRadius: overlayPxToCqw(PREVIEW_TEXT_OVERLAY_BORDER_RADIUS),
            backgroundColor,
            padding: hasBackground
              ? `${overlayPxToCqw(IMAGE_OVERLAY_BOX_PADDING_VERTICAL_PX)} ${overlayPxToCqw(IMAGE_OVERLAY_BOX_PADDING_HORIZONTAL_PX)}`
              : "0",
            color: PREVIEW_TEXT_OVERLAY_TEXT_COLOR[overlay.background],
            textAlign: "center"
          }}
        >
          {lineStyles.map((line, i) => (
            <div
              key={i}
              style={{
                fontFamily: line.fontFamily,
                fontWeight: line.fontWeight,
                fontSize: overlayPxToCqw(line.fontSize),
                textTransform: line.textTransform,
                fontStyle: line.fontStyle,
                lineHeight: overlayPxToCqw(line.fontSize * line.lineHeight),
                letterSpacing:
                  typeof line.letterSpacing === "number"
                    ? overlayPxToCqw(line.letterSpacing)
                    : line.letterSpacing,
                textShadow: line.textShadow,
                marginTop:
                  typeof line.marginTop === "number"
                    ? overlayPxToCqw(line.marginTop)
                    : line.marginTop,
                marginBottom:
                  typeof line.marginBottom === "number"
                    ? overlayPxToCqw(line.marginBottom)
                    : line.marginBottom
              }}
            >
              {line.text}
            </div>
          ))}
          {arrowPath ? (
            <LoadingImage
              src={arrowPath}
              alt=""
              aria-hidden
              width={120}
              height={20}
              style={{
                display: "block",
                margin: `${overlayPxToCqw(8)} auto 0`,
                maxWidth: "100%",
                opacity: 0.95,
                filter: "invert(1) drop-shadow(0 2px 6px rgba(0, 0, 0, 0.45))"
              }}
            />
          ) : null}
        </div>
      </div>
    </div>
  );
}

export function ListingImagePreviewGrid({
  items,
  captionSubcategoryLabel,
  loadingCount = 0
}: ListingImagePreviewGridProps) {
  const [selectedItemId, setSelectedItemId] = React.useState<string | null>(
    null
  );
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

  const skeletonCount = Math.max(0, loadingCount);

  if (items.length === 0 && skeletonCount === 0) {
    return null;
  }

  const selectedSlides = selectedItem?.slides ?? [];
  const selectedTemplatePattern = selectedItem
    ? resolveItemTemplatePattern(selectedItem)
    : "sandwich";
  const selectedSlide = selectedSlides[activeSlideIndex] ?? null;
  const selectedOverlay =
    selectedItem && selectedSlide
      ? buildPreviewOverlay(
          selectedItem.id,
          selectedSlide,
          activeSlideIndex,
          selectedTemplatePattern
        )
      : null;

  return (
    <>
      <div className="grid grid-cols-2 gap-2 md:grid-cols-3 md:gap-3 xl:grid-cols-3">
        {items.map((item) => {
          const itemTemplatePattern = resolveItemTemplatePattern(item);
          const cardSlideIndex = cardSlideIndexById[item.id] ?? 0;
          const normalizedCardSlideIndex =
            item.slides.length > 0
              ? ((cardSlideIndex % item.slides.length) + item.slides.length) %
                item.slides.length
              : 0;
          const coverSlide = item.slides[normalizedCardSlideIndex] ?? null;
          const coverOverlay = coverSlide
            ? buildPreviewOverlay(
                item.id,
                coverSlide,
                normalizedCardSlideIndex,
                itemTemplatePattern
              )
            : null;
          const coverImage = coverSlide?.imageUrl ?? item.coverImageUrl ?? null;
          const hasOverlay = Boolean(coverOverlay);

          return (
            <div
              key={item.id}
              role="button"
              tabIndex={0}
              className="group overflow-hidden rounded-xl bg-card shadow-sm text-left"
              onClick={() => setSelectedItemId(item.id)}
              onKeyDown={(event) => {
                if (event.key === "Enter" || event.key === " ") {
                  event.preventDefault();
                  setSelectedItemId(item.id);
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
                {coverOverlay ? (
                  <ImageTextOverlay overlay={coverOverlay} />
                ) : null}
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
                        setCardSlideIndexById((prev) => ({
                          ...prev,
                          [item.id]:
                            ((prev[item.id] ?? 0) - 1 + item.slides.length) %
                            item.slides.length
                        }));
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
                        setCardSlideIndexById((prev) => ({
                          ...prev,
                          [item.id]:
                            ((prev[item.id] ?? 0) + 1) % item.slides.length
                        }));
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
                          setCardSlideIndexById((prev) => ({
                            ...prev,
                            [item.id]: index
                          }));
                        }}
                        aria-label={`View slide ${index + 1}`}
                      />
                    ))}
                  </div>
                ) : null}
              </div>
            </div>
          );
        })}
        {Array.from({ length: skeletonCount }, (_, i) => (
          <div
            key={`skeleton-image-${i}`}
            className="relative overflow-hidden rounded-xl bg-secondary animate-pulse"
          >
            <div className="aspect-square w-full" />
            <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground/70" />
            </div>
          </div>
        ))}
      </div>

      <Dialog
        open={Boolean(selectedItem)}
        onOpenChange={(open) => {
          if (!open) {
            setSelectedItemId(null);
          }
        }}
      >
        <DialogContent className="h-[80vh] w-[60vw] max-w-[calc(100vw-2rem)] sm:max-w-[1600px] grid-rows-[auto_minmax(0,1fr)] overflow-hidden">
          <DialogHeader>
            <DialogTitle>Image Preview</DialogTitle>
          </DialogHeader>
          {selectedItem ? (
            <div className="grid h-full min-h-0 gap-6 md:grid-cols-[minmax(0,1fr)_490px]">
              <div className="group relative flex min-h-0 items-center justify-center overflow-hidden rounded-lg bg-card p-3">
                <div className="relative aspect-square w-full max-w-[720px] overflow-hidden rounded-lg">
                  {selectedSlide?.imageUrl ? (
                    <LoadingImage
                      src={selectedSlide.imageUrl}
                      alt="Listing image preview"
                      fill
                      sizes="(min-width: 768px) 60vw, 100vw"
                      className="object-cover"
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
                      className="absolute left-5 top-1/2 h-6 w-6 -translate-y-1/2 rounded-full border border-white/35 bg-white/20 text-white/90 opacity-0 transition-opacity duration-200 hover:bg-white/30 group-hover:opacity-100"
                      onClick={() =>
                        setActiveSlideIndex(
                          (prev) =>
                            (prev - 1 + selectedSlides.length) %
                            selectedSlides.length
                        )
                      }
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </Button>
                    <Button
                      type="button"
                      size="icon"
                      variant="ghost"
                      className="absolute right-5 top-1/2 h-6 w-6 -translate-y-1/2 rounded-full border border-white/35 bg-white/20 text-white/90 opacity-0 transition-opacity duration-200 hover:bg-white/30 group-hover:opacity-100"
                      onClick={() =>
                        setActiveSlideIndex(
                          (prev) => (prev + 1) % selectedSlides.length
                        )
                      }
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
                          onClick={() => setActiveSlideIndex(index)}
                          aria-label={`View slide ${index + 1}`}
                        />
                      ))}
                    </div>
                  </>
                ) : null}
              </div>
              <div className="min-h-0 overflow-y-auto rounded-lg border border-border bg-card p-4">
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
    </>
  );
}
