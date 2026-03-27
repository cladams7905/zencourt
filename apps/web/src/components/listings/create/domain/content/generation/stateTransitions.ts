"use client";

import type { ListingContentItem as ContentItem } from "@web/src/lib/domain/listings/content";
import type { FilterBucket, FilterBuckets } from "../items/filterBuckets";
import { removeCurrentBatchItems } from "./mappers";

type ListingContentItem = ContentItem;

export function settleBucketItems(
  bucket: FilterBucket,
  items: ListingContentItem[]
): FilterBucket {
  return {
    ...bucket,
    items,
    isLoadingInitialPage: false,
    isLoadingMore: false,
    hasFetchedInitialPage: true,
    offset: items.length,
    loadedCount: items.length
  };
}

export function removeBatchItemsFromBucket(
  bucket: FilterBucket,
  batchItemIds: string[]
): FilterBucket {
  const nextItems = removeCurrentBatchItems(bucket.items, batchItemIds);
  return {
    ...bucket,
    items: nextItems,
    loadedCount: nextItems.length
  };
}

export function appendPageItems(
  bucket: FilterBucket,
  page: {
    items: ListingContentItem[];
    hasMore: boolean;
    nextOffset: number;
  }
): FilterBucket {
  const existingIds = new Set(bucket.items.map((item) => item.id));
  const appendedItems = page.items.filter((item) => !existingIds.has(item.id));
  const nextItems =
    appendedItems.length > 0 ? [...bucket.items, ...appendedItems] : bucket.items;

  return {
    ...bucket,
    items: nextItems,
    isLoadingMore: false,
    hasMore: page.hasMore,
    offset: page.nextOffset,
    loadedCount: nextItems.length
  };
}

export function removeContentItemFromBuckets(
  buckets: FilterBuckets,
  contentItemId: string
): FilterBuckets {
  let didChange = false;
  const next: FilterBuckets = {};

  for (const [filterKey, bucket] of Object.entries(buckets)) {
    const nextItems = bucket.items.filter((item) => item.id !== contentItemId);
    if (nextItems.length !== bucket.items.length) {
      didChange = true;
      next[filterKey] = {
        ...bucket,
        items: nextItems,
        loadedCount: nextItems.length
      };
      continue;
    }
    next[filterKey] = bucket;
  }

  return didChange ? next : buckets;
}

export function replaceContentItemInBuckets(
  buckets: FilterBuckets,
  params: {
    previousContentItemId: string;
    nextItem: ListingContentItem;
  }
): FilterBuckets {
  let didReplace = false;
  const next: FilterBuckets = {};

  for (const [filterKey, bucket] of Object.entries(buckets)) {
    const nextItems = bucket.items.map((item) => {
      if (item.id !== params.previousContentItemId) {
        return item;
      }
      didReplace = true;
      return params.nextItem;
    });

    next[filterKey] = didReplace
      ? {
          ...bucket,
          items: nextItems,
          loadedCount: nextItems.length
        }
      : bucket;
  }

  return didReplace ? next : buckets;
}
