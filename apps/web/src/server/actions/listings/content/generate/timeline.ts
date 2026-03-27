import type { DashboardContentItem as ContentItem } from "@web/src/components/dashboard/shared/types";
import { buildListingCreatePreviewPlans } from "@web/src/lib/domain/listing/createPreviewPlans";
import type { ListingContentSubcategory } from "@shared/types/models";
import type { ListingGeneratedItem } from "@web/src/server/infra/cache/listingContent/cache";

type GeneratedPreviewContentItem = ContentItem & {
  cacheKeyTimestamp: number;
  cacheKeyId: number;
};

function buildGeneratedContentItem(params: {
  item: ListingGeneratedItem;
  subcategory: ListingContentSubcategory;
  cacheKeyTimestamp: number;
  cacheKeyId: number;
}): ContentItem {
  return {
    id: `generated-${params.cacheKeyTimestamp}-${params.cacheKeyId}`,
    aspectRatio: "square",
    isFavorite: false,
    hook: params.item.hook,
    caption: params.item.caption ?? null,
    body: params.item.body ?? null,
    brollQuery: params.item.broll_query ?? null,
    listingSubcategory: params.subcategory,
    mediaType: "video",
    cacheKeyTimestamp: params.cacheKeyTimestamp,
    cacheKeyId: params.cacheKeyId
  } as GeneratedPreviewContentItem;
}

export function addGeneratedVideoTimelines(params: {
  listingId: string;
  subcategory: ListingContentSubcategory;
  items: ListingGeneratedItem[];
  videoItems: ContentItem[];
  cacheKeyTimestamp: number;
}): ListingGeneratedItem[] {
  const { listingId, subcategory, items, videoItems, cacheKeyTimestamp } = params;

  return items.map((item, index) => {
    if (item.orderedClipIds?.length) {
      return item;
    }

    const [plan] = buildListingCreatePreviewPlans({
      listingId,
      activeMediaTab: "videos",
      activeSubcategory: subcategory,
      activeMediaItems: [
        buildGeneratedContentItem({
          item,
          subcategory,
          cacheKeyTimestamp,
          cacheKeyId: index
        })
      ],
      videoItems
    });

    if (!plan) {
      return item;
    }

    return {
      ...item,
      orderedClipIds: plan.segments.map((segment) => segment.clipId),
      clipDurationOverrides: Object.fromEntries(
        plan.segments.map((segment) => [segment.clipId, segment.durationSeconds])
      )
    };
  });
}
