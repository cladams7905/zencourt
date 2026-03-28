"use client";

import * as React from "react";
import type { PreviewTimelinePlan } from "@web/src/components/listings/create/domain";
import type { ListingContentSubcategory } from "@shared/types/models";
import type { ListingContentItem as ContentItem } from "@web/src/lib/domain/listings/content";
import type { ListingOpenHouseContext } from "@web/src/lib/domain/listings/content/openHouse";
import { saveListingVideoReel } from "@web/src/server/actions/listings/content/reels";
import { buildPlayablePreviews } from "@web/src/components/listings/create/media/video/videoPreviewViewModel";
import { PREVIEW_FPS } from "@web/src/components/listings/create/media/video/constants";
import { useHoverReveal } from "@web/src/components/listings/create/media/video/hooks";
import { VideoPreviewCard } from "@web/src/components/listings/create/media/video/components/VideoPreviewCard";
import { VideoPreviewModal } from "@web/src/components/listings/create/media/video/components/VideoPreviewModal";
import { VideoPreviewSkeletonCard } from "@web/src/components/listings/create/media/video/components/VideoPreviewSkeletonCard";
import type { PlayablePreviewTextUpdate } from "@web/src/components/listings/create/shared/types";

type ListingVideoPreviewGridProps = {
  listingId: string;
  plans: PreviewTimelinePlan[];
  items: ContentItem[];
  captionItems: ContentItem[];
  listingSubcategory: ListingContentSubcategory;
  listingAddress: string | null;
  openHouseContext: ListingOpenHouseContext | null;
  userMediaVideoCount: number;
  forceSimpleOverlayTemplate?: boolean;
  loadingCount?: number;
  onReplacePreviewItem: (params: {
    previousContentItemId: string;
    nextItem: ContentItem;
  }) => void;
};

export function ListingVideoPreviewGrid({
  listingId,
  plans,
  items,
  captionItems,
  listingSubcategory,
  listingAddress,
  openHouseContext,
  userMediaVideoCount,
  forceSimpleOverlayTemplate = false,
  loadingCount = 0,
  onReplacePreviewItem
}: ListingVideoPreviewGridProps) {
  const [selectedPlanId, setSelectedPlanId] = React.useState<string | null>(
    null
  );
  const [favoritePlanIds, setFavoritePlanIds] = React.useState<Set<string>>(
    new Set()
  );
  const { activeId, revealedId, handleEnter, handleLeave } = useHoverReveal();

  const playablePlans = React.useMemo(
    () =>
      buildPlayablePreviews({
        plans,
        items,
        captionItems,
        listingSubcategory,
        listingAddress,
        openHouseContext,
        forceSimpleOverlayTemplate,
        previewFps: PREVIEW_FPS
      }),
    [
      captionItems,
      forceSimpleOverlayTemplate,
      items,
      listingAddress,
      openHouseContext,
      listingSubcategory,
      plans
    ]
  );

  const skeletonCount = Math.max(0, loadingCount);

  const selectedPreview =
    playablePlans.find((preview) => preview.id === selectedPlanId) ?? null;

  const handleSavePreviewText = React.useCallback(
    async (params: PlayablePreviewTextUpdate) => {
      if (!selectedPreview?.captionItem || !selectedPreview.captionItemKey) {
        throw new Error("This preview cannot be edited yet.");
      }

      const savedItem = await saveListingVideoReel(listingId, params);

      onReplacePreviewItem({
        previousContentItemId: selectedPreview.captionItem.id,
        nextItem: savedItem
      });
    },
    [listingId, onReplacePreviewItem, selectedPreview]
  );

  if (playablePlans.length === 0 && skeletonCount === 0) {
    return null;
  }

  return (
    <>
      <div className="grid grid-cols-2 gap-2 md:grid-cols-3 md:gap-3 xl:grid-cols-4">
        {playablePlans.map((preview) => (
          <VideoPreviewCard
            key={preview.id}
            preview={preview}
            isActive={activeId === preview.id}
            isRevealed={revealedId === preview.id}
            isFavorite={favoritePlanIds.has(preview.id)}
            previewFps={PREVIEW_FPS}
            onEnter={() => handleEnter(preview.id)}
            onLeave={handleLeave}
            onSelect={() => setSelectedPlanId(preview.id)}
            onToggleFavorite={() =>
              setFavoritePlanIds((prev) => {
                const next = new Set(prev);
                if (next.has(preview.id)) {
                  next.delete(preview.id);
                } else {
                  next.add(preview.id);
                }
                return next;
              })
            }
          />
        ))}
        {[...Array(skeletonCount).keys()].map((n) => (
          <VideoPreviewSkeletonCard key={`skeleton-video-${n}`} />
        ))}
      </div>

      <VideoPreviewModal
        selectedPreview={selectedPreview}
        userMediaVideoCount={userMediaVideoCount}
        previewFps={PREVIEW_FPS}
        onOpenChange={(open) => {
          if (!open) {
            setSelectedPlanId(null);
          }
        }}
        onSavePreviewText={handleSavePreviewText}
      />
    </>
  );
}
