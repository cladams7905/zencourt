import type { ListingContentItem as ContentItem } from "@web/src/lib/domain/listings/content";
import { buildListingCreatePreviewPlans } from "@web/src/lib/domain/listings/content/createPreviewPlans";
import type { ListingContentSubcategory } from "@shared/types/models";
import type { ListingGeneratedItem } from "@web/src/server/infra/cache/listingContent/cache";

type ListingContentItem = ContentItem;
type ListingClipItem = ContentItem;

type GeneratedPreviewContentItem = ContentItem & {
  cacheKeyTimestamp: number;
  cacheKeyId: number;
};

function buildGeneratedContentItem(params: {
  item: ListingGeneratedItem;
  subcategory: ListingContentSubcategory;
  cacheKeyTimestamp: number;
  cacheKeyId: number;
}): ListingContentItem {
  return {
    id: `generated-${params.cacheKeyTimestamp}-${params.cacheKeyId}`,
    aspectRatio: "square",
    isFavorite: false,
    hook: params.item.hook,
    caption: params.item.caption ?? null,
    body: null,
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
  listingClipItems: ListingClipItem[];
  cacheKeyTimestamp: number;
}): ListingGeneratedItem[] {
  const { listingId, subcategory, items, listingClipItems, cacheKeyTimestamp } =
    params;

  return items.map((item, index) => {
    if (item.orderedClipIds?.length) {
      return item;
    }

    const [plan] = buildListingCreatePreviewPlans({
      listingId,
      activeMediaTab: "videos",
      activeSubcategory: subcategory,
      activeContentItems: [
        buildGeneratedContentItem({
          item,
          subcategory,
          cacheKeyTimestamp,
          cacheKeyId: index
        })
      ],
      listingClipItems
    });

    if (!plan) {
      return item;
    }

    return {
      ...item,
      orderedClipIds: plan.segments.map((segment) => segment.clipId),
      clipDurationOverrides: Object.fromEntries(
        plan.segments.map((segment) => [
          segment.clipId,
          segment.durationSeconds
        ])
      )
    };
  });
}
