"use client";

import {
  LISTING_CREATE_INITIAL_PAGE_SIZE,
  type ListingCreateMediaTab
} from "@web/src/components/listings/create/shared/constants";
import type { ListingContentSubcategory } from "@shared/types/models";
import type { ListingContentItem as ContentItem } from "@web/src/lib/domain/listings/content";
import type { ListingContentItemsPage } from "./client";

const EMPTY_ITEMS: ContentItem[] = [];

export type FilterBucket = {
  items: ContentItem[];
  isLoadingInitialPage: boolean;
  isLoadingMore: boolean;
  hasFetchedInitialPage: boolean;
  hasMore: boolean;
  offset: number;
  loadedCount: number;
};

export type FilterBuckets = Record<string, FilterBucket>;

export function buildFilterKey(
  mediaTab: ListingCreateMediaTab,
  subcategory: ListingContentSubcategory
) {
  return `${mediaTab}:${subcategory}`;
}

export function buildInitialBucket(items: ContentItem[]): FilterBucket {
  return {
    items,
    isLoadingInitialPage: false,
    isLoadingMore: false,
    hasFetchedInitialPage: true,
    hasMore: items.length === LISTING_CREATE_INITIAL_PAGE_SIZE,
    offset: items.length,
    loadedCount: items.length
  };
}

export function getEmptyBucket(): FilterBucket {
  return {
    items: EMPTY_ITEMS,
    isLoadingInitialPage: false,
    isLoadingMore: false,
    hasFetchedInitialPage: false,
    hasMore: false,
    offset: 0,
    loadedCount: 0
  };
}

export function buildFetchedBucket(
  page: ListingContentItemsPage
): FilterBucket {
  return {
    items: page.items,
    isLoadingInitialPage: false,
    isLoadingMore: false,
    hasFetchedInitialPage: true,
    hasMore: page.hasMore,
    offset: page.nextOffset,
    loadedCount: page.items.length
  };
}
