import type { ContentItem } from "@web/src/components/dashboard/components/ContentGrid";
import type { ListingContentSubcategory } from "@shared/types/models";
import type {
  FinalContentItem,
  StreamedContentItem
} from "@web/src/components/listings/create/domain/contentGenerationTypes";

function buildGeneratedContentItem(params: {
  id: string;
  item: StreamedContentItem | FinalContentItem;
  subcategory: ListingContentSubcategory;
  mediaType: "video" | "image";
}): ContentItem {
  return {
    id: params.id,
    aspectRatio: "square" as const,
    isFavorite: false,
    hook: params.item.hook,
    caption: params.item.caption ?? null,
    body: params.item.body ?? null,
    brollQuery: params.item.broll_query ?? null,
    listingSubcategory: params.subcategory,
    mediaType: params.mediaType
  };
}

export function ensureBatchItemIds(params: {
  currentIds: string[];
  requiredCount: number;
  activeBatchId: string;
}): string[] {
  const next = [...params.currentIds];
  for (let index = next.length; index < params.requiredCount; index += 1) {
    next[index] = `generated-${params.activeBatchId}-${index}`;
  }
  return next;
}

export function mapStreamedItemsToContentItems(params: {
  items: StreamedContentItem[];
  batchItemIds: string[];
  subcategory: ListingContentSubcategory;
  mediaType: "video" | "image";
}): ContentItem[] {
  return params.items.map((item, index) =>
    buildGeneratedContentItem({
      id: params.batchItemIds[index]!,
      item,
      subcategory: params.subcategory,
      mediaType: params.mediaType
    })
  );
}

export function mapFinalItemsToContentItems(params: {
  items: FinalContentItem[];
  batchItemIds: string[];
  subcategory: ListingContentSubcategory;
  mediaType: "video" | "image";
}): ContentItem[] {
  return params.items.map((item, index) =>
    buildGeneratedContentItem({
      id: params.batchItemIds[index]!,
      item,
      subcategory: params.subcategory,
      mediaType: params.mediaType
    })
  );
}

export function removeCurrentBatchItems(
  items: ContentItem[],
  batchItemIds: string[]
): ContentItem[] {
  const currentBatchIds = new Set(batchItemIds);
  return items.filter((item) => !currentBatchIds.has(item.id));
}

export function mergeBatchItems(params: {
  previousItems: ContentItem[];
  finalItems: ContentItem[];
  batchItemIds: string[];
  forceNewBatch?: boolean;
}): ContentItem[] {
  const withoutCurrentBatch = removeCurrentBatchItems(
    params.previousItems,
    params.batchItemIds
  );

  if (!params.forceNewBatch) {
    const existingIds = new Set(withoutCurrentBatch.map((item) => item.id));
    const unique = params.finalItems.filter(
      (item) => !existingIds.has(item.id)
    );
    return unique.length > 0
      ? [...withoutCurrentBatch, ...unique]
      : withoutCurrentBatch;
  }

  return [...withoutCurrentBatch, ...params.finalItems];
}
