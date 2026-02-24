import * as React from "react";
import type { ContentItem } from "@web/src/components/dashboard/components/ContentGrid";
import {
  buildPreviewTimelinePlan,
  type PreviewTimelinePlan
} from "@web/src/components/listings/create/domain/previewTimeline";
import {
  type PreviewClipCandidate,
  filterFeatureClips
} from "@web/src/components/listings/create/domain/listingCreateUtils";
import type { ListingContentSubcategory } from "@shared/types/models";

export function useListingCreatePreviewPlans(params: {
  listingId: string;
  activeMediaTab: "videos" | "images";
  activeSubcategory: ListingContentSubcategory;
  activeMediaItems: ContentItem[];
  videoItems: ContentItem[];
}) {
  const { listingId, activeMediaTab, activeSubcategory, activeMediaItems, videoItems } = params;

  return React.useMemo(() => {
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
  }, [activeMediaItems, activeMediaTab, activeSubcategory, listingId, videoItems]);
}
