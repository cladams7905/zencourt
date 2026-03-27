"use client";

import * as React from "react";
import type { ListingContentItem as ContentItem } from "@web/src/lib/domain/listings/content";
import { type ListingContentSubcategory } from "@shared/types/models";
import {
  LISTING_CREATE_INITIAL_PAGE_SIZE,
  type ListingCreateMediaTab
} from "@web/src/components/listings/create/shared/constants";
import { buildFilterKey } from "../items/filterBuckets";
import {
  removeContentItemFromBuckets,
  replaceContentItemInBuckets
} from "./stateTransitions";
import { useListingContentBuckets } from "./useListingContentBuckets";
import { useListingContentStreamGeneration } from "./useListingContentStreamGeneration";
import { useListingContentWarmup } from "./useListingContentWarmup";

type ListingContentItem = ContentItem;
type ListingClipItem = ContentItem;

export function useContentGeneration(params: {
  listingId: string;
  listingContentItems: ListingContentItem[];
  initialMediaTab: ListingCreateMediaTab;
  initialSubcategory: ListingContentSubcategory;
  activeMediaTab: ListingCreateMediaTab;
  activeSubcategory: ListingContentSubcategory;
  listingClipItems: ListingClipItem[];
}): {
  bucketContentItems: ListingContentItem[];
  isGenerating: boolean;
  generationError: string | null;
  loadingCount: number;
  initialPageLoadingCount: number;
  loadingMoreCount: number;
  hasMoreForActiveFilter: boolean;
  generateSubcategoryContent: (
    subcategory: ListingContentSubcategory,
    options?: {
      forceNewBatch?: boolean;
      generationCount?: number;
      templateId?: string;
    }
  ) => Promise<void>;
  removeContentItem: (contentItemId: string) => void;
  loadMoreForActiveFilter: () => Promise<void>;
  replaceContentItem: (params: {
    previousContentItemId: string;
    nextItem: ListingContentItem;
  }) => void;
} {
  const {
    listingId,
    listingContentItems,
    initialMediaTab,
    initialSubcategory,
    activeMediaTab,
    activeSubcategory,
    listingClipItems
  } = params;

  const initialServerFilterKey = React.useMemo(
    () => buildFilterKey(initialMediaTab, initialSubcategory),
    [initialMediaTab, initialSubcategory]
  );
  const currentFilterKey = React.useMemo(
    () => buildFilterKey(activeMediaTab, activeSubcategory),
    [activeMediaTab, activeSubcategory]
  );
  const activeControllerRef = React.useRef<AbortController | null>(null);
  const activeGeneratingFilterKeyRef = React.useRef<string | null>(null);
  const {
    currentBucket,
    fetchFirstPageForFilter,
    loadMoreForActiveFilter,
    updateBuckets,
    updateBucket
  } = useListingContentBuckets({
    listingId,
    listingContentItems,
    initialServerFilterKey,
    currentFilterKey,
    activeMediaTab,
    activeSubcategory,
    activeGeneratingFilterKeyRef,
    activeControllerRef
  });
  const stream = useListingContentStreamGeneration({
    listingId,
    activeMediaTab,
    activeSubcategory,
    listingClipItems,
    activeControllerRef,
    activeGeneratingFilterKeyRef,
    updateBucket
  });
  useListingContentWarmup({
    listingId,
    activeMediaTab,
    activeSubcategory,
    fetchFirstPageForFilter
  });

  const removeContentItem = React.useCallback(
    (contentItemId: string) => {
      updateBuckets((prev) =>
        removeContentItemFromBuckets(prev, contentItemId)
      );
    },
    [updateBuckets]
  );

  const replaceContentItem = React.useCallback(
    (params: { previousContentItemId: string; nextItem: ContentItem }) => {
      updateBuckets((prev) => replaceContentItemInBuckets(prev, params));
    },
    [updateBuckets]
  );
  const initialPageLoadingCount =
    currentBucket.isLoadingInitialPage && currentBucket.items.length === 0
      ? LISTING_CREATE_INITIAL_PAGE_SIZE
      : 0;
  const loadingMoreCount = currentBucket.isLoadingMore
    ? LISTING_CREATE_INITIAL_PAGE_SIZE
    : 0;

  return {
    bucketContentItems: currentBucket.items,
    isGenerating: stream.isGenerating,
    generationError: stream.generationError,
    loadingCount: stream.loadingCount,
    initialPageLoadingCount,
    loadingMoreCount,
    hasMoreForActiveFilter: currentBucket.hasMore,
    generateSubcategoryContent: stream.generateSubcategoryContent,
    removeContentItem,
    loadMoreForActiveFilter,
    replaceContentItem
  };
}
