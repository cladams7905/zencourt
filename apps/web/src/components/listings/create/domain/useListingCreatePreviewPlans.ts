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

function applyOrderedClipIds(
  plan: PreviewTimelinePlan,
  orderedClipIds: string[] | null | undefined
): PreviewTimelinePlan {
  if (!orderedClipIds?.length) {
    return plan;
  }

  const segmentByClipId = new Map(
    plan.segments.map((segment) => [segment.clipId, segment])
  );
  const orderedSegments = orderedClipIds
    .map((clipId) => segmentByClipId.get(clipId))
    .filter(
      (segment): segment is PreviewTimelinePlan["segments"][number] =>
        Boolean(segment)
    );
  const remainingSegments = plan.segments.filter(
    (segment) => !orderedClipIds.includes(segment.clipId)
  );

  if (orderedSegments.length === 0) {
    return plan;
  }

  return {
    ...plan,
    segments: [...orderedSegments, ...remainingSegments]
  };
}

function applyClipDurationOverrides(
  plan: PreviewTimelinePlan,
  clipDurationOverrides: Record<string, number> | null | undefined
): PreviewTimelinePlan {
  if (!clipDurationOverrides) {
    return plan;
  }

  const segments = plan.segments.map((segment) => {
    const override = clipDurationOverrides[segment.clipId];
    if (!Number.isFinite(override)) {
      return segment;
    }

    return {
      ...segment,
      durationSeconds: Number(
        Math.min(
          segment.maxDurationSeconds,
          Math.max(2, override)
        ).toFixed(2)
      )
    };
  });

  return {
    ...plan,
    segments,
    totalDurationSeconds: Number(
      segments
        .reduce((sum, segment) => sum + segment.durationSeconds, 0)
        .toFixed(2)
    )
  };
}

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
      const plan = buildPreviewTimelinePlan({
        clips: scopedClips,
        listingId,
        seedKey: `${activeSubcategory}-${captionItem.id}`
      });

      return applyClipDurationOverrides(
        applyOrderedClipIds(plan, captionItem.orderedClipIds),
        captionItem.clipDurationOverrides
      );
    });
  }, [activeMediaItems, activeMediaTab, activeSubcategory, listingId, videoItems]);
}
