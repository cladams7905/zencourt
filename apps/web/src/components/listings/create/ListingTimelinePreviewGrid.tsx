"use client";

import * as React from "react";
import { Player } from "@remotion/player";
import { Download, Edit, Heart, Loader2 } from "lucide-react";
import { Button } from "../../ui/button";
import { cn } from "../../ui/utils";
import type {
  ContentItem,
  TextOverlayInput
} from "../../dashboard/ContentGrid";
import type {
  PreviewTextOverlay,
  PreviewTimelinePlan
} from "@web/src/lib/video/previewTimeline";
import type { ListingContentSubcategory } from "@shared/types/models";
import {
  hashTextOverlaySeed,
  pickPreviewTextOverlayVariant,
  buildOverlayTemplateLines,
  appendRandomHeaderSuffix,
  pickSandwichOverlayArrowPath,
  PREVIEW_TEXT_OVERLAY_BACKGROUND_COLOR,
  PREVIEW_TEXT_OVERLAY_BACKGROUND_COLOR_OPAQUE,
  PREVIEW_TEXT_OVERLAY_POSITION_TOP,
  PREVIEW_TEXT_OVERLAY_LAYOUT,
  PREVIEW_TEXT_OVERLAY_MAX_WIDTH,
  PREVIEW_TEXT_OVERLAY_BORDER_RADIUS,
  PREVIEW_TEXT_OVERLAY_TEXT_COLOR,
  overlayPxToCqw,
  computeOverlayLineStyles,
  type OverlayVariant
} from "@shared/utils";
import { LoadingImage } from "../../ui/loading-image";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle
} from "../../ui/dialog";
import {
  ListingTimelinePreviewComposition,
  getTimelineDurationInFrames,
  type TimelinePreviewResolvedSegment
} from "./ListingTimelinePreviewComposition";

type ListingTimelinePreviewGridProps = {
  plans: PreviewTimelinePlan[];
  items: ContentItem[];
  captionItems: ContentItem[];
  listingSubcategory: ListingContentSubcategory;
  captionSubcategoryLabel: string;
  listingAddress: string | null;
  forceSimpleOverlayTemplate?: boolean;
  loadingCount?: number;
};

type PlayablePreview = {
  id: string;
  resolvedSegments: TimelinePreviewResolvedSegment[];
  thumbnailOverlay: PreviewTextOverlay | null;
  thumbnailAddressOverlay:
    | TimelinePreviewResolvedSegment["supplementalAddressOverlay"]
    | null;
  firstThumb: string | null;
  durationInFrames: number;
  captionItem: ContentItem | null;
  variationNumber: number;
};

const PREVIEW_FPS = 30;
const PREVIEW_TRANSITION_SECONDS = 0;
const LOCATION_EMOJI = "📍";

// ---------------------------------------------------------------------------
// Overlay construction helpers
// ---------------------------------------------------------------------------

interface SlideOverlayData {
  plainText: string;
  textOverlay?: TextOverlayInput | null;
}

function getSlideOverlayData(
  captionItem: ContentItem | null
): SlideOverlayData[] {
  const slides = captionItem?.body ?? [];
  const data: SlideOverlayData[] = slides
    .filter((slide) => slide.header?.trim())
    .map((slide) => ({
      plainText: slide.header.trim(),
      textOverlay: slide.text_overlay ?? null
    }));

  if (data.length > 0) return data;

  const fallback = captionItem?.hook?.trim();
  return fallback ? [{ plainText: fallback }] : [];
}

function normalizeForAddressMatch(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function extractStreetAddress(address: string): string {
  const street = address.split(",")[0]?.trim() ?? "";
  return street;
}

function slideContainsAddress(
  slideData: SlideOverlayData,
  normalizedAddress: string
): boolean {
  const parts = [
    slideData.plainText,
    slideData.textOverlay?.headline ?? "",
    slideData.textOverlay?.accent_top ?? "",
    slideData.textOverlay?.accent_bottom ?? ""
  ];
  return parts.some((value) =>
    normalizeForAddressMatch(value).includes(normalizedAddress)
  );
}

function buildAddressSupplementalOverlay(
  primaryOverlay: PreviewTextOverlay,
  listingAddress: string
): TimelinePreviewResolvedSegment["supplementalAddressOverlay"] {
  const addressText = `${LOCATION_EMOJI} ${listingAddress.trim()}`;
  const shouldPushLower =
    primaryOverlay.templatePattern !== "simple" ||
    primaryOverlay.position === "top-third";
  return {
    placement: shouldPushLower
      ? "low-bottom"
      : primaryOverlay.position === "top-third"
        ? "bottom-third"
        : "below-primary",
    overlay: {
      text: addressText,
      position: "bottom-third",
      background:
        primaryOverlay.templatePattern === "simple" &&
        primaryOverlay.background === "none"
          ? "none"
          : primaryOverlay.background === "none"
            ? "black"
            : primaryOverlay.background,
      font: primaryOverlay.font,
      templatePattern: "simple",
      lines: [{ text: addressText, fontRole: "body" }],
      fontPairing: primaryOverlay.fontPairing
    }
  };
}

function buildRichOverlay(
  slideData: SlideOverlayData,
  variant: OverlayVariant,
  options?: { forceSimpleTemplate?: boolean }
): PreviewTextOverlay {
  const textOverlay = slideData.textOverlay;
  const normalizedOverlay = options?.forceSimpleTemplate
    ? {
        headline: textOverlay?.headline ?? slideData.plainText,
        accent_top: null,
        accent_bottom: null
      }
    : textOverlay;
  const { pattern: templatePattern, lines } = buildOverlayTemplateLines(
    normalizedOverlay,
    slideData.plainText,
    options?.forceSimpleTemplate ? "simple" : undefined
  );
  const isRichTemplate = templatePattern !== "simple";
  const simpleSeedBase = `${slideData.plainText}:${normalizedOverlay?.headline ?? "simple"}:${variant.position}:${variant.fontPairing}`;
  const brownBackgroundOptions: PreviewTextOverlay["background"][] = [
    "brown",
    "brown-700",
    "brown-500",
    "brown-300",
    "brown-200",
    "brown-100"
  ];
  const simpleBackgroundBucket =
    hashTextOverlaySeed(`${simpleSeedBase}:bg-bucket`) % 3;
  const simpleBackground: PreviewTextOverlay["background"] =
    simpleBackgroundBucket === 0
      ? "none"
      : simpleBackgroundBucket === 1
        ? "black"
        : (brownBackgroundOptions[
            hashTextOverlaySeed(`${simpleSeedBase}:bg-brown`) %
              brownBackgroundOptions.length
          ] ?? "brown");
  const simplePositionOptions: PreviewTextOverlay["position"][] = [
    "top-third",
    "center",
    "bottom-third"
  ];
  const simplePosition =
    simplePositionOptions[
      hashTextOverlaySeed(`${simpleSeedBase}:position`) %
        simplePositionOptions.length
    ] ?? variant.position;
  const makeSimpleSuffixRandom = () => {
    const values = [
      hashTextOverlaySeed(`${simpleSeedBase}:suffix-bucket`) / 0x100000000,
      hashTextOverlaySeed(`${simpleSeedBase}:suffix-emoji`) / 0x100000000
    ];
    let index = 0;
    return () => {
      const value = values[Math.min(index, values.length - 1)] ?? 0;
      index += 1;
      return value;
    };
  };
  const resolvedLines =
    templatePattern === "simple"
      ? lines.map((line, index) =>
          index === 0
            ? {
                ...line,
                text: appendRandomHeaderSuffix(line.text, {
                  random: makeSimpleSuffixRandom()
                })
              }
            : line
        )
      : lines;

  return {
    text: slideData.plainText,
    position: templatePattern === "simple" ? simplePosition : "center",
    background: isRichTemplate ? "none" : simpleBackground,
    font: variant.font,
    templatePattern,
    lines: resolvedLines,
    fontPairing: variant.fontPairing
  };
}

// ---------------------------------------------------------------------------
// Thumbnail text overlay (DOM with CSS transform scaling)
// ---------------------------------------------------------------------------

function ThumbnailTextOverlay({
  overlay,
  topOverride,
  baseFontSizePxOverride
}: {
  overlay: PreviewTextOverlay;
  topOverride?: string;
  baseFontSizePxOverride?: number;
}) {
  const hasBackground = overlay.background !== "none";
  const backgroundColor =
    overlay.templatePattern === "simple"
      ? PREVIEW_TEXT_OVERLAY_BACKGROUND_COLOR_OPAQUE[overlay.background]
      : PREVIEW_TEXT_OVERLAY_BACKGROUND_COLOR[overlay.background];
  const layout = PREVIEW_TEXT_OVERLAY_LAYOUT.video;
  const lineStyles = computeOverlayLineStyles(
    overlay,
    baseFontSizePxOverride ?? layout.fontSizePx
  );
  const overlayTop =
    topOverride ?? PREVIEW_TEXT_OVERLAY_POSITION_TOP[overlay.position];
  const shouldCenterByPosition = !topOverride && overlay.position === "center";
  const arrowPath = pickSandwichOverlayArrowPath(overlay);

  return (
    <div
      style={{
        position: "absolute",
        inset: 0,
        overflow: "hidden",
        pointerEvents: "none",
        containerType: "inline-size"
      }}
    >
      <div
        style={{
          width: "100%",
          height: "100%"
        }}
      >
        <div
          style={{
            position: "absolute",
            top: overlayTop,
            left: 0,
            right: 0,
            display: "flex",
            justifyContent: "center",
            paddingLeft: overlayPxToCqw(layout.horizontalPaddingPx),
            paddingRight: overlayPxToCqw(layout.horizontalPaddingPx),
            transform: shouldCenterByPosition ? "translateY(-50%)" : undefined
          }}
        >
          <div
            style={{
              maxWidth: PREVIEW_TEXT_OVERLAY_MAX_WIDTH,
              borderRadius: PREVIEW_TEXT_OVERLAY_BORDER_RADIUS,
              backgroundColor,
              padding: hasBackground
                ? `${overlayPxToCqw(layout.boxPaddingVerticalPx)} ${overlayPxToCqw(layout.boxPaddingHorizontalPx)}`
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
                width={220}
                height={40}
                aria-hidden
                style={{
                  display: "block",
                  margin: `${overlayPxToCqw(8)} auto 0`,
                  width: overlayPxToCqw(220),
                  maxWidth: "100%",
                  opacity: 0.95,
                  filter: "invert(1) drop-shadow(0 2px 6px rgba(0, 0, 0, 0.45))"
                }}
              />
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main grid component
// ---------------------------------------------------------------------------

export function ListingTimelinePreviewGrid({
  plans,
  items,
  captionItems,
  listingSubcategory,
  captionSubcategoryLabel,
  listingAddress,
  forceSimpleOverlayTemplate = false,
  loadingCount = 0
}: ListingTimelinePreviewGridProps) {
  const [activePlanId, setActivePlanId] = React.useState<string | null>(null);
  const [revealedPlanId, setRevealedPlanId] = React.useState<string | null>(
    null
  );
  const [selectedPlanId, setSelectedPlanId] = React.useState<string | null>(
    null
  );
  const [favoritePlanIds, setFavoritePlanIds] = React.useState<Set<string>>(
    new Set()
  );
  const revealTimerRef = React.useRef<number | null>(null);

  const itemById = React.useMemo(
    () =>
      new Map(
        items.map((item) => [
          item.id,
          {
            id: item.id,
            videoUrl: item.videoUrl ?? null,
            thumbnail: item.thumbnail ?? null
          }
        ])
      ),
    [items]
  );

  const playablePlans = React.useMemo<PlayablePreview[]>(() => {
    const listingStreetAddress = extractStreetAddress(listingAddress ?? "");
    const normalizedListingAddress =
      normalizeForAddressMatch(listingStreetAddress);
    const shouldEnforceAddressOverlay =
      listingSubcategory === "new_listing" &&
      normalizedListingAddress.length > 0;

    const resolved = plans.map<PlayablePreview | null>((plan, index) => {
      const resolvedSegments: TimelinePreviewResolvedSegment[] = plan.segments
        .map((segment) => {
          const source = itemById.get(segment.clipId);
          if (!source?.videoUrl) {
            return null;
          }
          return {
            ...segment,
            src: source.videoUrl
          };
        })
        .filter((segment): segment is TimelinePreviewResolvedSegment =>
          Boolean(segment)
        );
      if (resolvedSegments.length < 2) {
        return null;
      }
      const captionItem = captionItems.at(index) ?? null;
      const slideOverlayData = getSlideOverlayData(captionItem);
      const seed = `${plan.id}:${captionItem?.id ?? "no-caption"}`;
      const overlayVariant = pickPreviewTextOverlayVariant(seed);
      const segmentsWithOverlays = resolvedSegments.map(
        (segment, segmentIndex) => {
          const data = slideOverlayData.length
            ? slideOverlayData[segmentIndex % slideOverlayData.length]
            : undefined;
          if (!data) return segment;
          const primaryOverlay = buildRichOverlay(data, overlayVariant, {
            forceSimpleTemplate: forceSimpleOverlayTemplate
          });
          const needsAddressSupplement =
            shouldEnforceAddressOverlay &&
            !slideContainsAddress(data, normalizedListingAddress) &&
            Boolean(listingAddress?.trim());

          return {
            ...segment,
            textOverlay: primaryOverlay,
            supplementalAddressOverlay: needsAddressSupplement
              ? buildAddressSupplementalOverlay(
                  primaryOverlay,
                  listingStreetAddress
                )
              : undefined
          };
        }
      );
      const firstThumb =
        itemById.get(resolvedSegments[0].clipId)?.thumbnail ?? null;
      const firstSegmentWithOverlay = segmentsWithOverlays.find(
        (segment) => segment.textOverlay
      );
      const thumbnailOverlay = firstSegmentWithOverlay?.textOverlay ?? null;
      const thumbnailAddressOverlay =
        firstSegmentWithOverlay?.supplementalAddressOverlay ?? null;
      const durationInFrames = getTimelineDurationInFrames(
        segmentsWithOverlays,
        PREVIEW_FPS,
        PREVIEW_TRANSITION_SECONDS
      );
      return {
        id: `${plan.id}-${resolvedSegments.length}`,
        resolvedSegments: segmentsWithOverlays,
        thumbnailOverlay,
        thumbnailAddressOverlay,
        firstThumb,
        durationInFrames,
        captionItem,
        variationNumber: index + 1
      };
    });
    return resolved.filter((plan): plan is PlayablePreview => Boolean(plan));
  }, [
    captionItems,
    forceSimpleOverlayTemplate,
    itemById,
    listingAddress,
    listingSubcategory,
    plans
  ]);

  const clearRevealTimer = React.useCallback(() => {
    if (revealTimerRef.current !== null) {
      window.clearTimeout(revealTimerRef.current);
      revealTimerRef.current = null;
    }
  }, []);

  const handlePlanEnter = React.useCallback(
    (planId: string) => {
      clearRevealTimer();
      setActivePlanId(planId);
      setRevealedPlanId(null);
      revealTimerRef.current = window.setTimeout(() => {
        setRevealedPlanId(planId);
        revealTimerRef.current = null;
      }, 120);
    },
    [clearRevealTimer]
  );

  const handlePlanLeave = React.useCallback(() => {
    clearRevealTimer();
    // Fade out the player and fade in the thumbnail overlay first
    setRevealedPlanId(null);
    // Unmount the player after the crossfade completes
    revealTimerRef.current = window.setTimeout(() => {
      setActivePlanId(null);
      revealTimerRef.current = null;
    }, 200);
  }, [clearRevealTimer]);

  React.useEffect(() => {
    return () => clearRevealTimer();
  }, [clearRevealTimer]);

  const skeletonCount = Math.max(0, loadingCount);

  if (playablePlans.length === 0 && skeletonCount === 0) {
    return null;
  }

  const selectedPreview =
    playablePlans.find((preview) => preview.id === selectedPlanId) ?? null;

  return (
    <>
      <div className="grid grid-cols-2 gap-2 md:grid-cols-3 md:gap-3 xl:grid-cols-4">
        {playablePlans.map((preview) => {
          const isActive = activePlanId === preview.id;
          const isRevealed = revealedPlanId === preview.id;
          return (
            <div
              key={preview.id}
              className="group overflow-hidden rounded-xl bg-card shadow-sm"
              onMouseEnter={() => handlePlanEnter(preview.id)}
              onMouseLeave={handlePlanLeave}
              onClick={() => setSelectedPlanId(preview.id)}
            >
              <div className="relative overflow-hidden">
                <div className="absolute right-3 top-3 z-10 flex gap-2 opacity-0 transition-opacity duration-300 group-hover:opacity-100">
                  <Button
                    size="icon"
                    variant="ghost"
                    onClick={(event) => {
                      event.preventDefault();
                      event.stopPropagation();
                      toast("Edit controls will be added here.");
                    }}
                    className="h-6 w-6 rounded-full border border-background/30 bg-background/20 text-background backdrop-blur-md hover:bg-background/30 hover:border-background/70"
                    aria-label="Edit reel preview"
                  >
                    <Edit className="h-3.5 w-3.5" />
                  </Button>
                  <Button
                    size="icon"
                    variant="ghost"
                    onClick={(event) => {
                      event.preventDefault();
                      event.stopPropagation();
                      const sourceUrl = preview.resolvedSegments[0]?.src;
                      if (!sourceUrl) {
                        toast.error("No clip available to download.");
                        return;
                      }
                      window.open(sourceUrl, "_blank", "noopener,noreferrer");
                    }}
                    className="h-6 w-6 rounded-full border border-background/30 bg-background/20 text-background backdrop-blur-md hover:bg-background/30 hover:border-background/70"
                    aria-label="Download reel preview"
                  >
                    <Download className="h-3.5 w-3.5" />
                  </Button>
                  <Button
                    size="icon"
                    variant="ghost"
                    onClick={(event) => {
                      event.preventDefault();
                      event.stopPropagation();
                      setFavoritePlanIds((prev) => {
                        const next = new Set(prev);
                        if (next.has(preview.id)) {
                          next.delete(preview.id);
                        } else {
                          next.add(preview.id);
                        }
                        return next;
                      });
                    }}
                    className={cn(
                      "h-6 w-6 rounded-full border backdrop-blur-md transition-all",
                      favoritePlanIds.has(preview.id)
                        ? "bg-primary/90 border-primary text-primary-foreground hover:bg-primary"
                        : "bg-background/20 border-background/30 text-background hover:bg-background/30 hover:border-background/70"
                    )}
                    aria-label="Favorite reel preview"
                  >
                    <Heart
                      className={cn(
                        "h-3.5 w-3.5",
                        favoritePlanIds.has(preview.id) && "fill-current"
                      )}
                    />
                  </Button>
                </div>
                <div className="relative aspect-9/16 w-full bg-card">
                  {preview.firstThumb ? (
                    <LoadingImage
                      src={preview.firstThumb}
                      alt="Reel preview"
                      fill
                      unoptimized
                      blurClassName=""
                      sizes="(min-width: 1024px) 24vw, (min-width: 768px) 32vw, 100vw"
                      className="object-cover"
                    />
                  ) : null}
                  {preview.thumbnailOverlay ? (
                    <ThumbnailTextOverlay overlay={preview.thumbnailOverlay} />
                  ) : null}
                  {preview.thumbnailAddressOverlay ? (
                    <ThumbnailTextOverlay
                      overlay={preview.thumbnailAddressOverlay.overlay}
                      topOverride={
                        preview.thumbnailAddressOverlay.placement ===
                        "below-primary"
                          ? "79%"
                          : preview.thumbnailAddressOverlay.placement ===
                              "low-bottom"
                            ? "84%"
                            : PREVIEW_TEXT_OVERLAY_POSITION_TOP["bottom-third"]
                      }
                      baseFontSizePxOverride={
                        PREVIEW_TEXT_OVERLAY_LAYOUT.video.fontSizePx * 0.58
                      }
                    />
                  ) : null}
                  {isActive ? (
                    <Player
                      component={ListingTimelinePreviewComposition}
                      inputProps={{
                        segments: preview.resolvedSegments,
                        transitionDurationSeconds: PREVIEW_TRANSITION_SECONDS
                      }}
                      durationInFrames={preview.durationInFrames}
                      compositionWidth={1080}
                      compositionHeight={1920}
                      fps={PREVIEW_FPS}
                      loop
                      autoPlay
                      controls={false}
                      initiallyMuted
                      renderPoster={() =>
                        preview.firstThumb ? (
                          <LoadingImage
                            src={preview.firstThumb}
                            alt="Reel preview"
                            fill
                            style={{
                              width: "100%",
                              height: "100%",
                              objectFit: "cover"
                            }}
                          />
                        ) : null
                      }
                      showPosterWhenUnplayed
                      showPosterWhenBuffering
                      showPosterWhenBufferingAndPaused
                      clickToPlay={false}
                      doubleClickToFullscreen={false}
                      spaceKeyToPlayOrPause={false}
                      style={{
                        width: "100%",
                        height: "100%",
                        opacity: isRevealed ? 1 : 0,
                        transition: "opacity 120ms ease"
                      }}
                      acknowledgeRemotionLicense
                    />
                  ) : null}
                </div>
              </div>
            </div>
          );
        })}
        {Array.from({ length: skeletonCount }, (_, i) => (
          <div
            key={`skeleton-video-${i}`}
            className="relative overflow-hidden rounded-xl bg-secondary animate-pulse"
          >
            <div className="aspect-9/16 w-full" />
            <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground/70" />
            </div>
          </div>
        ))}
      </div>

      <Dialog
        open={Boolean(selectedPreview)}
        onOpenChange={(open) => {
          if (!open) {
            setSelectedPlanId(null);
          }
        }}
      >
        <DialogContent className="h-[80vh] w-[60vw] max-w-[calc(100vw-2rem)] sm:max-w-[1600px] grid-rows-[auto_minmax(0,1fr)] overflow-hidden">
          <DialogHeader>
            <DialogTitle>Reel Preview</DialogTitle>
          </DialogHeader>
          {selectedPreview ? (
            <div className="grid h-full min-h-0 gap-6 md:grid-cols-[minmax(0,1fr)_490px]">
              <div className="flex min-h-0 items-center justify-center overflow-hidden rounded-lg bg-card">
                <div className="relative h-full aspect-9/16 w-auto">
                  <Player
                    component={ListingTimelinePreviewComposition}
                    inputProps={{
                      segments: selectedPreview.resolvedSegments,
                      transitionDurationSeconds: PREVIEW_TRANSITION_SECONDS
                    }}
                    durationInFrames={selectedPreview.durationInFrames}
                    compositionWidth={1080}
                    compositionHeight={1920}
                    fps={PREVIEW_FPS}
                    loop
                    autoPlay
                    controls
                    initiallyMuted
                    renderPoster={() =>
                      selectedPreview.firstThumb ? (
                        <LoadingImage
                          src={selectedPreview.firstThumb}
                          alt="Reel preview"
                          fill
                          style={{
                            width: "100%",
                            height: "100%",
                            objectFit: "cover"
                          }}
                        />
                      ) : null
                    }
                    showPosterWhenUnplayed
                    showPosterWhenBuffering
                    showPosterWhenBufferingAndPaused
                    style={{ width: "100%", height: "100%" }}
                    acknowledgeRemotionLicense
                  />
                </div>
              </div>
              <div className="min-h-0 overflow-y-auto rounded-lg border border-border bg-card p-4">
                <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  {captionSubcategoryLabel} Caption · Variation{" "}
                  {selectedPreview.variationNumber}
                </p>
                <div className="mt-4 space-y-4">
                  {selectedPreview.captionItem?.hook ? (
                    <div>
                      <p className="text-xs font-semibold text-muted-foreground">
                        Hook
                      </p>
                      <p className="text-sm text-foreground">
                        {selectedPreview.captionItem.hook}
                      </p>
                    </div>
                  ) : null}

                  <div>
                    <p className="text-xs font-semibold text-muted-foreground">
                      Caption
                    </p>
                    <p className="mt-1 whitespace-pre-line text-sm text-foreground">
                      {selectedPreview.captionItem?.caption?.trim()
                        ? selectedPreview.captionItem.caption
                        : "No caption available yet for this subcategory."}
                    </p>
                  </div>

                  {selectedPreview.captionItem?.body?.length ? (
                    <div>
                      <p className="text-xs font-semibold text-muted-foreground">
                        Slide Notes
                      </p>
                      <div className="mt-2 space-y-2">
                        {selectedPreview.captionItem.body.map(
                          (slide, index) => (
                            <p
                              key={`${selectedPreview.captionItem?.id}-slide-${index}`}
                              className="text-xs text-muted-foreground"
                            >
                              {index + 1}. {slide.header}: {slide.content}
                            </p>
                          )
                        )}
                      </div>
                    </div>
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
