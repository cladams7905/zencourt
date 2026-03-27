"use client";

import * as React from "react";
import { toast } from "sonner";
import type { ListingContentItem as ContentItem } from "@web/src/lib/domain/listings/content";
import type { ListingContentSubcategory } from "@shared/types/models";
import {
  LISTING_CREATE_INITIAL_PAGE_SIZE,
  type ListingCreateMediaTab
} from "@web/src/components/listings/create/shared/constants";
import {
  buildFetchedBucket,
  buildFilterKey,
  buildInitialBucket,
  getEmptyBucket,
  type FilterBucket,
  type FilterBuckets
} from "../items/filterBuckets";
import { fetchListingContentItemsPageCached } from "../items/transport";
import { appendPageItems } from "./stateTransitions";

type ListingContentItem = ContentItem;

function buildContentItemRevision(item: ListingContentItem): string {
  const cacheIdentity = item as ContentItem & {
    cacheKeyTimestamp?: number;
    cacheKeyId?: number;
  };
  const bodyRevision = (item.body ?? [])
    .map((slide) => `${slide.header ?? ""}|${slide.content ?? ""}`)
    .join("||");
  return [
    item.id,
    item.listingSubcategory ?? "",
    item.mediaType ?? "",
    item.hook ?? "",
    item.caption ?? "",
    item.brollQuery ?? "",
    (item.orderedClipIds ?? []).join("|"),
    JSON.stringify(item.clipDurationOverrides ?? {}),
    JSON.stringify(item.reelSequence ?? []),
    bodyRevision,
    String(cacheIdentity.cacheKeyTimestamp ?? ""),
    String(cacheIdentity.cacheKeyId ?? ""),
    item.contentSource ?? "",
    item.savedContentId ?? ""
  ].join("::");
}

function buildListingContentItemsRevision(items: ListingContentItem[]): string {
  return items.map(buildContentItemRevision).join("###");
}

export function useListingContentBuckets(params: {
  listingId: string;
  listingContentItems: ListingContentItem[];
  initialServerFilterKey: string;
  currentFilterKey: string;
  activeMediaTab: ListingCreateMediaTab;
  activeSubcategory: ListingContentSubcategory;
  activeGeneratingFilterKeyRef: React.MutableRefObject<string | null>;
  activeControllerRef: React.MutableRefObject<AbortController | null>;
}) {
  const {
    listingId,
    listingContentItems,
    initialServerFilterKey,
    currentFilterKey,
    activeMediaTab,
    activeSubcategory,
    activeGeneratingFilterKeyRef,
    activeControllerRef
  } = params;

  const [filterBuckets, setFilterBuckets] = React.useState<FilterBuckets>(
    () => ({
      [initialServerFilterKey]: buildInitialBucket(listingContentItems)
    })
  );
  const lastSyncedServerRevisionRef = React.useRef<string>("");
  const filterBucketsRef = React.useRef<FilterBuckets>(filterBuckets);
  const listingRequestVersionRef = React.useRef(0);
  const inFlightWarmupsRef = React.useRef<Map<string, Promise<void>>>(
    new Map()
  );
  const listingContentItemsSnapshot = React.useMemo(
    () => buildListingContentItemsRevision(listingContentItems),
    [listingContentItems]
  );

  React.useEffect(() => {
    filterBucketsRef.current = filterBuckets;
  }, [filterBuckets]);

  const updateBucket = React.useCallback(
    (filterKey: string, updater: (bucket: FilterBucket) => FilterBucket) => {
      setFilterBuckets((prev) => {
        const current = prev[filterKey] ?? getEmptyBucket();
        const next = updater(current);
        if (next === current) {
          return prev;
        }
        return {
          ...prev,
          [filterKey]: next
        };
      });
    },
    []
  );

  const updateBuckets = React.useCallback(
    (updater: (buckets: FilterBuckets) => FilterBuckets) => {
      setFilterBuckets((prev) => updater(prev));
    },
    []
  );

  const isCurrentListingRequestVersion = React.useCallback(
    (version: number) => listingRequestVersionRef.current === version,
    []
  );

  React.useEffect(() => {
    listingRequestVersionRef.current += 1;
    activeControllerRef.current?.abort();
    inFlightWarmupsRef.current.clear();
    lastSyncedServerRevisionRef.current = "";
    setFilterBuckets({
      [initialServerFilterKey]: buildInitialBucket(listingContentItems)
    });
  }, [
    activeControllerRef,
    initialServerFilterKey,
    listingContentItems,
    listingId
  ]);

  React.useEffect(() => {
    const nextRevision = `${listingId}::${initialServerFilterKey}::${listingContentItemsSnapshot}`;
    if (nextRevision === lastSyncedServerRevisionRef.current) {
      return;
    }
    lastSyncedServerRevisionRef.current = nextRevision;

    setFilterBuckets((prev) => ({
      ...prev,
      [initialServerFilterKey]: buildInitialBucket(listingContentItems)
    }));
  }, [
    initialServerFilterKey,
    listingContentItems,
    listingContentItemsSnapshot,
    listingId
  ]);

  const fetchFirstPageForFilter = React.useCallback(
    async (
      mediaTab: ListingCreateMediaTab,
      subcategory: ListingContentSubcategory
    ) => {
      const filterKey = buildFilterKey(mediaTab, subcategory);
      const requestVersion = listingRequestVersionRef.current;
      const existingBucket = filterBucketsRef.current[filterKey];
      if (existingBucket?.hasFetchedInitialPage) {
        return;
      }

      const inFlight = inFlightWarmupsRef.current.get(filterKey);
      if (inFlight) {
        return inFlight;
      }

      updateBucket(filterKey, (bucket) => {
        if (bucket.isLoadingInitialPage || bucket.hasFetchedInitialPage) {
          return bucket;
        }
        return {
          ...bucket,
          isLoadingInitialPage: true
        };
      });

      const promise = fetchListingContentItemsPageCached(listingId, {
        mediaTab,
        subcategory,
        limit: LISTING_CREATE_INITIAL_PAGE_SIZE,
        offset: 0
      })
        .then((page) => {
          if (!isCurrentListingRequestVersion(requestVersion)) {
            return;
          }
          updateBucket(filterKey, () => buildFetchedBucket(page));
        })
        .catch(() => {
          if (!isCurrentListingRequestVersion(requestVersion)) {
            return;
          }
          updateBucket(filterKey, (bucket) => ({
            ...bucket,
            isLoadingInitialPage: false
          }));
        })
        .finally(() => {
          inFlightWarmupsRef.current.delete(filterKey);
        });

      inFlightWarmupsRef.current.set(filterKey, promise);
      return promise;
    },
    [isCurrentListingRequestVersion, listingId, updateBucket]
  );

  React.useEffect(() => {
    const currentBucket = filterBuckets[currentFilterKey];
    if (
      currentBucket?.hasFetchedInitialPage ||
      currentBucket?.isLoadingInitialPage
    ) {
      return;
    }

    void fetchFirstPageForFilter(activeMediaTab, activeSubcategory);
  }, [
    activeMediaTab,
    activeSubcategory,
    currentFilterKey,
    fetchFirstPageForFilter,
    filterBuckets
  ]);

  const loadMoreForActiveFilter = React.useCallback(async () => {
    const currentBucket =
      filterBucketsRef.current[currentFilterKey] ?? getEmptyBucket();
    if (
      !currentBucket.hasFetchedInitialPage ||
      currentBucket.isLoadingInitialPage ||
      currentBucket.isLoadingMore ||
      !currentBucket.hasMore ||
      activeGeneratingFilterKeyRef.current === currentFilterKey
    ) {
      return;
    }

    updateBucket(currentFilterKey, (bucket) => ({
      ...bucket,
      isLoadingMore: true
    }));

    try {
      const requestVersion = listingRequestVersionRef.current;
      const page = await fetchListingContentItemsPageCached(listingId, {
        mediaTab: activeMediaTab,
        subcategory: activeSubcategory,
        limit: LISTING_CREATE_INITIAL_PAGE_SIZE,
        offset: currentBucket.offset
      });
      if (!isCurrentListingRequestVersion(requestVersion)) {
        return;
      }

      updateBucket(currentFilterKey, (bucket) => appendPageItems(bucket, page));
    } catch {
      if (!isCurrentListingRequestVersion(listingRequestVersionRef.current)) {
        return;
      }
      updateBucket(currentFilterKey, (bucket) => ({
        ...bucket,
        isLoadingMore: false
      }));
      toast.error("Failed to load more content.");
    }
  }, [
    activeGeneratingFilterKeyRef,
    activeMediaTab,
    activeSubcategory,
    currentFilterKey,
    isCurrentListingRequestVersion,
    listingId,
    updateBucket
  ]);

  return {
    currentBucket: filterBuckets[currentFilterKey] ?? getEmptyBucket(),
    filterBuckets,
    fetchFirstPageForFilter,
    loadMoreForActiveFilter,
    updateBuckets,
    updateBucket
  };
}
