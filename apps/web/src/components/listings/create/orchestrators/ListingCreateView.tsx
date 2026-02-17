"use client";

import * as React from "react";
import { ListingViewHeader } from "@web/src/components/listings/ListingViewHeader";
import { type ContentItem } from "@web/src/components/dashboard/ContentGrid";
import { emitListingSidebarUpdate } from "@web/src/lib/listingSidebarEvents";
import { usePathname, useRouter } from "next/navigation";
import {
  buildPreviewTimelinePlan,
  type PreviewTimelinePlan
} from "@web/src/lib/video/previewTimeline";
import { ListingTimelinePreviewGrid } from "@web/src/components/listings/create/orchestrators/ListingTimelinePreviewGrid";
import { ListingImagePreviewGrid } from "@web/src/components/listings/create/orchestrators/ListingImagePreviewGrid";
import {
  type PreviewClipCandidate,
  type ListingCreateImage,
  filterFeatureClips,
  resolveContentMediaType,
  rankListingImagesForItem,
  buildVariedImageSequence
} from "@web/src/components/listings/create/domain/listingCreateUtils";
import { useStickyHeader } from "@web/src/components/listings/create/shared/hooks/useStickyHeader";
import { useScrollFade } from "@web/src/components/listings/create/shared/hooks/useScrollFade";
import { useOrshotRender } from "@web/src/components/listings/create/domain/hooks/useOrshotRender";
import { useContentGeneration } from "@web/src/components/listings/create/domain/hooks/useContentGeneration";
import type { ListingImagePreviewItem } from "@web/src/components/listings/create/shared/types";
import {
  LISTING_CREATE_GENERATED_BATCH_SIZE,
  MEDIA_TAB_LABELS,
  SUBCATEGORY_LABELS,
  type ListingCreateMediaTab
} from "@web/src/components/listings/create/shared/constants";
import { cn } from "@web/src/components/ui/utils";
import { Button } from "@web/src/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger
} from "@web/src/components/ui/dropdown-menu";
import {
  Camera,
  ChevronDown,
  Clapperboard,
  RefreshCw,
  Settings
} from "lucide-react";
import { Tooltip, TooltipContent, TooltipTrigger } from "@web/src/components/ui/tooltip";
import {
  LISTING_CONTENT_SUBCATEGORIES,
  type ListingContentSubcategory
} from "@shared/types/models";

type ListingCreateViewProps = {
  listingId: string;
  title: string;
  listingAddress?: string | null;
  videoItems: ContentItem[];
  listingPostItems: ContentItem[];
  listingImages: ListingCreateImage[];
  initialMediaTab?: ListingCreateMediaTab;
  initialSubcategory?: ListingContentSubcategory;
};

export type { ListingCreateMediaTab } from "@web/src/components/listings/create/shared/constants";

export function ListingCreateView({
  listingId,
  title,
  listingAddress,
  videoItems,
  listingPostItems,
  listingImages,
  initialMediaTab = "videos",
  initialSubcategory = LISTING_CONTENT_SUBCATEGORIES[0]
}: ListingCreateViewProps) {
  const router = useRouter();
  const pathname = usePathname();
  const { sentinelRef: filterSentinelRef, isSticky: isFilterStickyActive } =
    useStickyHeader();
  const { containerRef: filterTagsRef, maskImage: tagFadeMask } =
    useScrollFade();
  const [activeMediaTab, setActiveMediaTab] =
    React.useState<ListingCreateMediaTab>(initialMediaTab);
  const [activeSubcategory, setActiveSubcategory] =
    React.useState<ListingContentSubcategory>(initialSubcategory);
  const {
    localPostItems,
    isGenerating,
    generationError,
    loadingCount,
    generateSubcategoryContent
  } = useContentGeneration({
    listingId,
    listingPostItems,
    activeMediaTab,
    activeSubcategory
  });
  const hasHandledInitialAutoGenerateRef = React.useRef(false);

  React.useEffect(() => {
    emitListingSidebarUpdate({
      id: listingId,
      listingStage: "create",
      lastOpenedAt: new Date().toISOString()
    });
  }, [listingId]);

  React.useEffect(() => {
    const next = new URLSearchParams(window.location.search);
    const mediaTypeParam = activeMediaTab === "images" ? "photos" : "videos";
    const filterParam = activeSubcategory;
    const currentMediaType = next.get("mediaType");
    const currentFilter = next.get("filter");

    if (currentMediaType === mediaTypeParam && currentFilter === filterParam) {
      return;
    }

    next.set("mediaType", mediaTypeParam);
    next.set("filter", filterParam);

    const query = next.toString();
    router.replace(query ? `${pathname}?${query}` : pathname, {
      scroll: false
    });
  }, [activeMediaTab, activeSubcategory, pathname, router]);

  const activeMediaItems = React.useMemo(
    () =>
      localPostItems.filter(
        (item) =>
          item.listingSubcategory === activeSubcategory &&
          resolveContentMediaType(item) ===
            (activeMediaTab === "videos" ? "video" : "image")
      ),
    [activeMediaTab, activeSubcategory, localPostItems]
  );
  const fallbackImagePreviewItems = React.useMemo<
    ListingImagePreviewItem[]
  >(() => {
    if (activeMediaTab !== "images" || activeMediaItems.length === 0) {
      return [];
    }

    const fallbackSortedImages = [...listingImages].sort((a, b) => {
      if (a.isPrimary !== b.isPrimary) {
        return (b.isPrimary ? 1 : 0) - (a.isPrimary ? 1 : 0);
      }
      const scoreDelta =
        (b.primaryScore ?? -Infinity) - (a.primaryScore ?? -Infinity);
      if (scoreDelta !== 0) {
        return scoreDelta;
      }
      return b.uploadedAtMs - a.uploadedAtMs;
    });

    return activeMediaItems.map((item, index) => {
      const rankedForItem = rankListingImagesForItem(
        fallbackSortedImages,
        item
      );
      const variedForItem = buildVariedImageSequence(
        rankedForItem,
        `${item.id}:${index}`
      );
      const fallbackSlides = [
        {
          id: `${item.id}-slide-fallback`,
          imageUrl: variedForItem[0]?.url ?? null,
          header: item.hook?.trim() || "Listing",
          content: item.caption?.trim() || "",
          textOverlay: null
        }
      ];
      const slides =
        item.body && item.body.length > 0
          ? item.body.map((slide, slideIndex) => ({
              id: `${item.id}-slide-${slideIndex}`,
              imageUrl:
                variedForItem[slideIndex % variedForItem.length]?.url ??
                variedForItem[0]?.url ??
                null,
              header: slide.header?.trim() || item.hook?.trim() || "Listing",
              content: slide.content?.trim() || "",
              textOverlay: slide.text_overlay ?? null
            }))
          : fallbackSlides;

      return {
        id: item.id,
        variationNumber: index + 1,
        hook: item.hook?.trim() || null,
        caption: item.caption?.trim() || null,
        slides,
        coverImageUrl: slides[0]?.imageUrl ?? null
      };
    });
  }, [activeMediaItems, activeMediaTab, listingImages]);

  const {
    previewItems: orshotPreviewItems,
    isRendering: isOrshotRendering,
    renderError: orshotRenderError
  } = useOrshotRender({
    listingId,
    activeSubcategory,
    activeMediaTab,
    captionItems: activeMediaItems,
    isGenerating
  });

  const activeImagePreviewItems = React.useMemo(
    () =>
      orshotPreviewItems.length > 0
        ? orshotPreviewItems
        : fallbackImagePreviewItems,
    [fallbackImagePreviewItems, orshotPreviewItems]
  );

  const imageLoadingCount =
    loadingCount > 0
      ? loadingCount
      : activeMediaTab === "images" && isOrshotRendering
        ? LISTING_CREATE_GENERATED_BATCH_SIZE
        : 0;
  const activePreviewPlans = React.useMemo(() => {
    if (activeMediaTab !== "videos") {
      return [];
    }

    const clips: PreviewClipCandidate[] = videoItems
      .filter((item) => Boolean(item.videoUrl))
      .map((item) => ({
        id: item.id,
        category: item.category ?? null,
        durationSeconds: item.durationSeconds ?? null,
        isPriorityCategory: item.isPriorityCategory ?? false,
        searchableText: `${item.category ?? ""} ${item.alt ?? ""}`
          .toLowerCase()
          .replace(/[^\w\s]/g, " ")
      }));
    if (clips.length === 0 || activeMediaItems.length === 0) {
      return [];
    }

    return activeMediaItems.map((captionItem): PreviewTimelinePlan => {
      const scopedClips =
        activeSubcategory === "property_features"
          ? filterFeatureClips(clips, captionItem)
          : clips;
      return buildPreviewTimelinePlan({
        clips: scopedClips,
        listingId,
        seedKey: `${activeSubcategory}-${captionItem.id}`
      });
    });
  }, [
    activeMediaItems,
    activeMediaTab,
    activeSubcategory,
    listingId,
    videoItems
  ]);

  React.useEffect(() => {
    if (hasHandledInitialAutoGenerateRef.current) {
      return;
    }
    if (isGenerating) {
      return;
    }
    if (
      activeMediaTab !== initialMediaTab ||
      activeSubcategory !== initialSubcategory
    ) {
      return;
    }

    hasHandledInitialAutoGenerateRef.current = true;
    if (activeMediaItems.length === 0) {
      void generateSubcategoryContent(activeSubcategory);
    }
  }, [
    activeMediaItems.length,
    activeMediaTab,
    activeSubcategory,
    generateSubcategoryContent,
    initialMediaTab,
    initialSubcategory,
    isGenerating
  ]);

  return (
    <>
      <ListingViewHeader
        title={title}
        className={isFilterStickyActive ? "shadow-none" : undefined}
      />
      <div ref={filterSentinelRef} className="h-0" aria-hidden />
      <div
        className={cn(
          "sticky md:top-[88px] top-[80px] z-20 w-full bg-background/90 py-6 backdrop-blur-md supports-backdrop-filter:bg-background/90",
          isFilterStickyActive ? "shadow-xs border-b border-border" : ""
        )}
      >
        <div className="mx-auto w-full max-w-[1600px] px-4 md:px-8">
          <div className="flex w-full items-center gap-3">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="outline"
                  className="h-9 gap-2 rounded-lg px-3 text-sm font-medium"
                >
                  {activeMediaTab === "videos" ? (
                    <Clapperboard className="h-4 w-4" />
                  ) : (
                    <Camera className="h-4 w-4" />
                  )}
                  {MEDIA_TAB_LABELS[activeMediaTab]}
                  <ChevronDown className="h-4 w-4 text-muted-foreground" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="w-40">
                <DropdownMenuItem
                  onClick={() => setActiveMediaTab("images")}
                  className={cn(
                    activeMediaTab === "images" &&
                      "bg-secondary text-foreground"
                  )}
                >
                  <Camera className="h-4 w-4" />
                  Photos
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => setActiveMediaTab("videos")}
                  className={cn(
                    activeMediaTab === "videos" &&
                      "bg-secondary text-foreground"
                  )}
                >
                  <Clapperboard className="h-4 w-4" />
                  Videos
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
            <div className="h-6 w-px bg-border/70" />
            <div
              ref={filterTagsRef}
              className="flex w-full items-center justify-start gap-2 overflow-x-auto scrollbar-hide sm:w-auto"
              style={
                tagFadeMask
                  ? { maskImage: tagFadeMask, WebkitMaskImage: tagFadeMask }
                  : undefined
              }
            >
              {LISTING_CONTENT_SUBCATEGORIES.map((subcategory) => {
                const isActive = activeSubcategory === subcategory;
                return (
                  <Button
                    key={subcategory}
                    size="sm"
                    variant={isActive ? "default" : "outline"}
                    className={cn(
                      "text-xs rounded-full font-medium whitespace-nowrap transition-all",
                      isActive
                        ? "bg-primary text-primary-foreground border-primary"
                        : "bg-background border-border hover:border-foreground/20"
                    )}
                    onClick={() => setActiveSubcategory(subcategory)}
                  >
                    {SUBCATEGORY_LABELS[subcategory]}
                  </Button>
                );
              })}
            </div>
            <div className="ml-auto flex items-center gap-3">
              <div className="h-6 w-px bg-border/70" />
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-9 w-9 shrink-0 rounded-full"
                    aria-label="Generation settings"
                  >
                    <Settings className="h-5 w-5" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="bottom">
                  Generation settings
                </TooltipContent>
              </Tooltip>
            </div>
          </div>
          {generationError || orshotRenderError ? (
            <p className="mt-3 text-sm text-red-500">
              {generationError ?? orshotRenderError}
            </p>
          ) : null}
        </div>
      </div>
      <div className="mx-auto w-full max-w-[1600px] px-4 md:px-8 pb-8 pt-8 md:pt-0">
        <section className="space-y-4">
          {activeMediaTab === "videos" &&
          (activePreviewPlans.length > 0 || isGenerating) ? (
            <ListingTimelinePreviewGrid
              plans={activePreviewPlans}
              items={videoItems}
              captionItems={activeMediaItems}
              listingSubcategory={activeSubcategory}
              captionSubcategoryLabel={SUBCATEGORY_LABELS[activeSubcategory]}
              listingAddress={listingAddress ?? null}
              forceSimpleOverlayTemplate
              loadingCount={loadingCount}
            />
          ) : activeMediaTab === "images" &&
            (activeImagePreviewItems.length > 0 ||
              isGenerating ||
              isOrshotRendering) ? (
            <ListingImagePreviewGrid
              items={activeImagePreviewItems}
              captionSubcategoryLabel={SUBCATEGORY_LABELS[activeSubcategory]}
              loadingCount={imageLoadingCount}
            />
          ) : (
            <div className="rounded-xl border border-border bg-background p-8 text-center text-sm text-muted-foreground">
              {activeMediaTab === "videos"
                ? "No reel variations yet for this subcategory."
                : "No image post drafts yet for this subcategory."}
            </div>
          )}
          <div className="mt-6 flex justify-center">
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  size="icon"
                  variant="secondary"
                  className="rounded-full"
                  aria-label="Generate more"
                  disabled={isGenerating}
                  onClick={() =>
                    void generateSubcategoryContent(activeSubcategory, {
                      forceNewBatch: true
                    })
                  }
                >
                  <RefreshCw className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="top">Generate more</TooltipContent>
            </Tooltip>
          </div>
        </section>
      </div>
    </>
  );
}
