"use client";

import * as React from "react";
import type { ContentItem } from "@web/src/components/dashboard/components/ContentGrid";
import type { PreviewTimelinePlan } from "@web/src/components/listings/create/domain/previewTimeline";
import type { ListingContentSubcategory } from "@shared/types/models";
import type { ListingOpenHouseContext } from "@web/src/lib/domain/listings/openHouse";
import { updateCachedListingVideoText } from "@web/src/server/actions/listings/cache";
import { buildPlayablePreviews } from "@web/src/components/listings/create/media/video/videoPreviewViewModel";
import { PREVIEW_FPS } from "@web/src/components/listings/create/media/video/previewConstants";
import { useHoverReveal } from "@web/src/components/listings/create/media/video/useHoverReveal";
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
  forceSimpleOverlayTemplate?: boolean;
  loadingCount?: number;
  onUpdatePreviewText: (params: {
    contentItemId: string;
    hook: string;
    caption: string;
    orderedClipIds: string[];
    clipDurationOverrides: Record<string, number>;
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
  forceSimpleOverlayTemplate = false,
  loadingCount = 0,
  onUpdatePreviewText
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

  if (playablePlans.length === 0 && skeletonCount === 0) {
    return null;
  }

  const selectedPreview =
    playablePlans.find((preview) => preview.id === selectedPlanId) ?? null;

  const handleSavePreviewText = React.useCallback(
    async (params: PlayablePreviewTextUpdate) => {
      if (!selectedPreview?.captionItem || !selectedPreview.captionItemKey) {
        throw new Error("This preview cannot be edited yet.");
      }

      await updateCachedListingVideoText(listingId, {
        cacheKeyTimestamp: params.captionItemKey.cacheKeyTimestamp,
        cacheKeyId: params.captionItemKey.cacheKeyId,
        subcategory: selectedPreview.captionItem.listingSubcategory ?? "",
        hook: params.hook,
        caption: params.caption,
        orderedClipIds: params.orderedClipIds,
        clipDurationOverrides: params.clipDurationOverrides
      });

      onUpdatePreviewText({
        contentItemId: selectedPreview.captionItem.id,
        hook: params.hook,
        caption: params.caption,
        orderedClipIds: params.orderedClipIds,
        clipDurationOverrides: params.clipDurationOverrides
      });
    },
    [listingId, onUpdatePreviewText, selectedPreview]
  );

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
