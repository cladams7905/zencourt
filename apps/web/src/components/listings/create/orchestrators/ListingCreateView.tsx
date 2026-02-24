"use client";

import * as React from "react";
import { ListingViewHeader } from "@web/src/components/listings/shared";
import { type ContentItem } from "@web/src/components/dashboard/components/ContentGrid";
import { usePathname, useRouter } from "next/navigation";
import { ListingVideoPreviewGrid } from "@web/src/components/listings/create/orchestrators/ListingVideoPreviewGrid";
import { ListingImagePreviewGrid } from "@web/src/components/listings/create/orchestrators/ListingImagePreviewGrid";
import { DevSingleTemplateRender } from "@web/src/components/listings/create/orchestrators/DevSingleTemplateRender";
import { type ListingCreateImage } from "@web/src/components/listings/create/domain/listingCreateUtils";
import { useStickyHeader } from "@web/src/components/listings/create/shared/hooks/useStickyHeader";
import { useScrollFade } from "@web/src/components/listings/create/shared/hooks/useScrollFade";
import {
  useListingCreateEffects,
  useListingCreateActiveMediaItems,
  useListingCreateMediaItems,
  useListingCreatePreviewPlans,
  useDeleteCachedPreviewItem,
  useTemplateRender,
  useContentGeneration
} from "@web/src/components/listings/create/domain";
import {
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
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger
} from "@web/src/components/ui/tooltip";
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
    generateSubcategoryContent,
    removeContentItem
  } = useContentGeneration({
    listingId,
    listingPostItems,
    activeMediaTab,
    activeSubcategory
  });

  const activeMediaItems = useListingCreateActiveMediaItems({
    activeMediaTab,
    activeSubcategory,
    localPostItems
  });

  const {
    previewItems: templatePreviewItems,
    isRendering: isTemplateRendering,
    renderError: templateRenderError,
    isTemplateRenderingUnavailable
  } = useTemplateRender({
    listingId,
    activeSubcategory,
    activeMediaTab,
    captionItems: activeMediaItems,
    isGenerating
  });

  const { activeImagePreviewItems, imageLoadingCount } = useListingCreateMediaItems({
    activeMediaTab,
    activeMediaItems,
    listingImages,
    isGenerating,
    isTemplateRendering,
    isTemplateRenderingUnavailable,
    templatePreviewItems
  });

  const activePreviewPlans = useListingCreatePreviewPlans({
    listingId,
    activeMediaTab,
    activeSubcategory,
    activeMediaItems,
    videoItems
  });

  const handleDeleteImagePreviewItem = useDeleteCachedPreviewItem({
    listingId,
    activeSubcategory,
    activeMediaItems,
    removeContentItem
  });

  useListingCreateEffects({
    listingId,
    pathname,
    replaceUrl: (url) => router.replace(url, { scroll: false }),
    activeMediaItemsLength: activeMediaItems.length,
    activeMediaTab,
    activeSubcategory,
    initialMediaTab,
    initialSubcategory,
    isGenerating,
    generationError,
    templateRenderError,
    generateSubcategoryContent
  });

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
        </div>
      </div>
      <div className="mx-auto w-full max-w-[1600px] px-4 md:px-8 pb-8 pt-8 md:pt-0">
        <section className="space-y-4">
          {activeMediaTab === "images" && (
            <DevSingleTemplateRender
              listingId={listingId}
              subcategory={activeSubcategory}
              captionItems={activeMediaItems}
            />
          )}
          {activeMediaTab === "videos" &&
          (activePreviewPlans.length > 0 || isGenerating) ? (
            <ListingVideoPreviewGrid
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
              isTemplateRendering) ? (
            <ListingImagePreviewGrid
              items={activeImagePreviewItems}
              captionSubcategoryLabel={SUBCATEGORY_LABELS[activeSubcategory]}
              loadingCount={imageLoadingCount}
              onDeleteItem={handleDeleteImagePreviewItem}
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
