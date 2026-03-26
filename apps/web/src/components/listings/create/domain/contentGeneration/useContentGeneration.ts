import * as React from "react";
import { toast } from "sonner";
import type { ContentItem } from "@web/src/components/dashboard/components/ContentGrid";
import {
  LISTING_CONTENT_SUBCATEGORIES,
  type ListingContentSubcategory
} from "@shared/types/models";
import { extractJsonItemsFromStream } from "@web/src/lib/sse/contentExtractor";
import {
  GENERATED_BATCH_SIZE,
  LISTING_CREATE_INITIAL_PAGE_SIZE,
  SUBCATEGORY_LABELS,
  type ListingCreateMediaTab
} from "@web/src/components/listings/create/shared/constants";
import {
  ensureBatchItemIds,
  mapFinalItemsToContentItems,
  mapStreamedItemsToContentItems,
  mergeBatchItems,
  removeCurrentBatchItems
} from "./mappers";
import {
  requestContentGenerationStream,
  streamContentGenerationEvents
} from "./stream";
import type { StreamedContentItem } from "./types";
import { buildListingCreatePreviewPlans } from "@web/src/components/listings/create/domain/useListingCreatePreviewPlans";
import { getListingCreatePostItemsForCurrentUser } from "@web/src/server/actions/listings/createPostItems";

const DEFAULT_GENERATION_COUNT = GENERATED_BATCH_SIZE;
const EMPTY_ITEMS: ContentItem[] = [];

type FilterBucket = {
  items: ContentItem[];
  isLoadingInitialPage: boolean;
  hasFetchedInitialPage: boolean;
  loadedCount: number;
};

type FilterBuckets = Record<string, FilterBucket>;

function buildContentItemRevision(item: ContentItem): string {
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

function buildListingPostItemsRevision(items: ContentItem[]): string {
  return items.map(buildContentItemRevision).join("###");
}

function generateUUID() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function buildFilterKey(
  mediaTab: ListingCreateMediaTab,
  subcategory: ListingContentSubcategory
) {
  return `${mediaTab}:${subcategory}`;
}

function buildInitialBucket(items: ContentItem[]): FilterBucket {
  return {
    items,
    isLoadingInitialPage: false,
    hasFetchedInitialPage: true,
    loadedCount: items.length
  };
}

function getEmptyBucket(): FilterBucket {
  return {
    items: EMPTY_ITEMS,
    isLoadingInitialPage: false,
    hasFetchedInitialPage: false,
    loadedCount: 0
  };
}

function getSiblingSubcategories(activeSubcategory: ListingContentSubcategory) {
  return LISTING_CONTENT_SUBCATEGORIES.filter(
    (subcategory) => subcategory !== activeSubcategory
  );
}

function getOppositeMediaTab(
  activeMediaTab: ListingCreateMediaTab
): ListingCreateMediaTab {
  return activeMediaTab === "videos" ? "images" : "videos";
}

export function useContentGeneration(params: {
  listingId: string;
  listingPostItems: ContentItem[];
  initialMediaTab: ListingCreateMediaTab;
  initialSubcategory: ListingContentSubcategory;
  activeMediaTab: ListingCreateMediaTab;
  activeSubcategory: ListingContentSubcategory;
  videoItems: ContentItem[];
}): {
  localPostItems: ContentItem[];
  isGenerating: boolean;
  generationError: string | null;
  loadingCount: number;
  initialPageLoadingCount: number;
  generateSubcategoryContent: (
    subcategory: ListingContentSubcategory,
    options?: {
      forceNewBatch?: boolean;
      generationCount?: number;
      templateId?: string;
    }
  ) => Promise<void>;
  removeContentItem: (contentItemId: string) => void;
  replaceContentItem: (params: {
    previousContentItemId: string;
    nextItem: ContentItem;
  }) => void;
} {
  const {
    listingId,
    listingPostItems,
    initialMediaTab,
    initialSubcategory,
    activeMediaTab,
    activeSubcategory,
    videoItems
  } = params;

  const initialServerFilterKey = React.useMemo(
    () => buildFilterKey(initialMediaTab, initialSubcategory),
    [initialMediaTab, initialSubcategory]
  );
  const currentFilterKey = React.useMemo(
    () => buildFilterKey(activeMediaTab, activeSubcategory),
    [activeMediaTab, activeSubcategory]
  );
  const [filterBuckets, setFilterBuckets] = React.useState<FilterBuckets>(
    () => ({
      [initialServerFilterKey]: buildInitialBucket(listingPostItems)
    })
  );
  const [isGenerating, setIsGenerating] = React.useState(false);
  const [incompleteBatchSkeletonCount, setIncompleteBatchSkeletonCount] =
    React.useState(0);
  const [generationError, setGenerationError] = React.useState<string | null>(
    null
  );

  const streamBufferRef = React.useRef("");
  const parsedItemsRef = React.useRef<StreamedContentItem[]>([]);
  const activeControllerRef = React.useRef<AbortController | null>(null);
  const activeBatchIdRef = React.useRef<string>("");
  const activeBatchItemIdsRef = React.useRef<string[]>([]);
  const activeGenerationCountRef = React.useRef<number>(
    DEFAULT_GENERATION_COUNT
  );
  const activeCacheKeyTimestampRef = React.useRef<number | null>(null);
  const lastSyncedServerRevisionRef = React.useRef<string>("");
  const filterBucketsRef = React.useRef<FilterBuckets>(filterBuckets);
  const inFlightWarmupsRef = React.useRef<Map<string, Promise<void>>>(
    new Map()
  );
  const listingPostItemsSnapshot = React.useMemo(
    () => buildListingPostItemsRevision(listingPostItems),
    [listingPostItems]
  );

  React.useEffect(() => {
    filterBucketsRef.current = filterBuckets;
  }, [filterBuckets]);

  React.useEffect(() => {
    setIncompleteBatchSkeletonCount(0);
  }, [activeSubcategory, activeMediaTab]);

  React.useEffect(() => {
    inFlightWarmupsRef.current.clear();
    lastSyncedServerRevisionRef.current = "";
    setFilterBuckets({
      [initialServerFilterKey]: buildInitialBucket(listingPostItems)
    });
  }, [listingId]);

  React.useEffect(() => {
    const nextRevision = `${listingId}::${initialServerFilterKey}::${listingPostItemsSnapshot}`;
    if (nextRevision === lastSyncedServerRevisionRef.current) {
      return;
    }
    lastSyncedServerRevisionRef.current = nextRevision;

    setFilterBuckets((prev) => ({
      ...prev,
      [initialServerFilterKey]: buildInitialBucket(listingPostItems)
    }));
  }, [
    initialServerFilterKey,
    listingId,
    listingPostItems,
    listingPostItemsSnapshot
  ]);

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

  const fetchFirstPageForFilter = React.useCallback(
    async (
      mediaTab: ListingCreateMediaTab,
      subcategory: ListingContentSubcategory
    ) => {
      const filterKey = buildFilterKey(mediaTab, subcategory);
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

      const promise = getListingCreatePostItemsForCurrentUser(listingId, {
        mediaTab,
        subcategory
      })
        .then((items) => {
          updateBucket(filterKey, () => ({
            items,
            isLoadingInitialPage: false,
            hasFetchedInitialPage: true,
            loadedCount: items.length
          }));
        })
        .catch(() => {
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
    [listingId, updateBucket]
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

  React.useEffect(() => {
    let cancelled = false;

    const warmCurrentMediaSiblings = async () => {
      await Promise.all(
        getSiblingSubcategories(activeSubcategory).map((subcategory) =>
          fetchFirstPageForFilter(activeMediaTab, subcategory)
        )
      );
    };

    const warmOppositeMedia = async () => {
      const oppositeMediaTab = getOppositeMediaTab(activeMediaTab);
      await Promise.all(
        LISTING_CONTENT_SUBCATEGORIES.map((subcategory) =>
          fetchFirstPageForFilter(oppositeMediaTab, subcategory)
        )
      );
    };

    void warmCurrentMediaSiblings().then(() => {
      if (cancelled) {
        return;
      }

      setTimeout(() => {
        if (cancelled) {
          return;
        }
        void warmOppositeMedia();
      }, 0);
    });

    return () => {
      cancelled = true;
    };
  }, [activeMediaTab, activeSubcategory, fetchFirstPageForFilter, listingId]);

  const generateSubcategoryContent = React.useCallback(
    async (
      subcategory: ListingContentSubcategory,
      options?: {
        forceNewBatch?: boolean;
        generationCount?: number;
        templateId?: string;
      }
    ) => {
      if (activeControllerRef.current) {
        activeControllerRef.current.abort();
      }
      const controller = new AbortController();
      const targetFilterKey = buildFilterKey(activeMediaTab, subcategory);
      activeControllerRef.current = controller;
      activeBatchIdRef.current = generateUUID();
      activeBatchItemIdsRef.current = [];
      activeGenerationCountRef.current =
        typeof options?.generationCount === "number" &&
        options.generationCount > 0
          ? options.generationCount
          : DEFAULT_GENERATION_COUNT;
      setIsGenerating(true);
      setIncompleteBatchSkeletonCount(0);
      setGenerationError(null);
      streamBufferRef.current = "";
      parsedItemsRef.current = [];
      activeCacheKeyTimestampRef.current = null;

      const resolvedMediaType: "video" | "image" =
        activeMediaTab === "videos" ? "video" : "image";

      try {
        const reader = await requestContentGenerationStream({
          listingId,
          subcategory,
          mediaType: resolvedMediaType,
          focus: SUBCATEGORY_LABELS[subcategory],
          generationNonce: options?.forceNewBatch ? generateUUID() : "",
          generationCount: activeGenerationCountRef.current,
          templateId: options?.templateId,
          signal: controller.signal
        });

        let didReceiveDone = false;

        for await (const event of streamContentGenerationEvents(reader)) {
          if (event.type === "meta") {
            activeCacheKeyTimestampRef.current =
              typeof event.meta?.cache_key_timestamp === "number"
                ? event.meta.cache_key_timestamp
                : null;
            continue;
          }

          if (event.type === "delta") {
            streamBufferRef.current += event.text;
            const parsedItems = extractJsonItemsFromStream<StreamedContentItem>(
              streamBufferRef.current
            );

            if (parsedItems.length > parsedItemsRef.current.length) {
              parsedItemsRef.current = parsedItems;
              activeBatchItemIdsRef.current = ensureBatchItemIds({
                currentIds: activeBatchItemIdsRef.current,
                requiredCount: parsedItems.length,
                activeBatchId: activeBatchIdRef.current
              });

              const streamedContentItems = mapStreamedItemsToContentItems({
                items: parsedItems,
                batchItemIds: activeBatchItemIdsRef.current,
                subcategory,
                mediaType: resolvedMediaType,
                cacheKeyTimestamp:
                  resolvedMediaType === "video"
                    ? (activeCacheKeyTimestampRef.current ?? undefined)
                    : undefined
              });

              updateBucket(targetFilterKey, (bucket) => {
                const nextItems = [
                  ...removeCurrentBatchItems(
                    bucket.items,
                    activeBatchItemIdsRef.current
                  ),
                  ...streamedContentItems
                ];
                return {
                  items: nextItems,
                  isLoadingInitialPage: false,
                  hasFetchedInitialPage: true,
                  loadedCount: nextItems.length
                };
              });
            }
          }

          if (event.type === "error") {
            throw new Error(event.message);
          }

          if (event.type === "done") {
            didReceiveDone = true;

            const missingCount = Math.max(
              0,
              activeGenerationCountRef.current - event.items.length
            );
            if (missingCount > 0) {
              setIncompleteBatchSkeletonCount(missingCount);
              setGenerationError("sorry, an error occurred. Please retry.");
              toast.error("Sorry, an error occurred. Please retry.");
            }

            activeBatchItemIdsRef.current = ensureBatchItemIds({
              currentIds: activeBatchItemIdsRef.current,
              requiredCount: event.items.length,
              activeBatchId: activeBatchIdRef.current
            });

            const finalItems = mapFinalItemsToContentItems({
              items: event.items,
              batchItemIds: activeBatchItemIdsRef.current,
              subcategory,
              mediaType: resolvedMediaType,
              cacheKeyTimestamp: event.meta?.cache_key_timestamp
            });
            const resolvedFinalItems =
              resolvedMediaType === "video"
                ? finalItems.map((item) => {
                    if (item.orderedClipIds?.length) {
                      return item;
                    }

                    const [plan] = buildListingCreatePreviewPlans({
                      listingId,
                      activeMediaTab: "videos",
                      activeSubcategory: subcategory,
                      activeMediaItems: [item],
                      videoItems
                    });

                    return plan
                      ? {
                          ...item,
                          orderedClipIds: plan.segments.map(
                            (segment) => segment.clipId
                          ),
                          clipDurationOverrides: Object.fromEntries(
                            plan.segments.map((segment) => [
                              segment.clipId,
                              segment.durationSeconds
                            ])
                          )
                        }
                      : item;
                  })
                : finalItems;

            updateBucket(targetFilterKey, (bucket) => {
              const nextItems = mergeBatchItems({
                previousItems: bucket.items,
                finalItems: resolvedFinalItems,
                batchItemIds: activeBatchItemIdsRef.current,
                forceNewBatch: options?.forceNewBatch
              });

              return {
                items: nextItems,
                isLoadingInitialPage: false,
                hasFetchedInitialPage: true,
                loadedCount: nextItems.length
              };
            });
          }
        }

        if (!didReceiveDone) {
          throw new Error("Stream ended before completing output.");
        }
      } catch (error) {
        if ((error as Error).name === "AbortError") {
          updateBucket(targetFilterKey, (bucket) => {
            const nextItems = removeCurrentBatchItems(
              bucket.items,
              activeBatchItemIdsRef.current
            );
            return {
              ...bucket,
              items: nextItems,
              loadedCount: nextItems.length
            };
          });
          return;
        }
        const message =
          error instanceof Error
            ? error.message
            : "Failed to generate listing content.";
        setGenerationError(message);
        toast.error(message);
        setIncompleteBatchSkeletonCount(activeGenerationCountRef.current);
        updateBucket(targetFilterKey, (bucket) => {
          const nextItems = removeCurrentBatchItems(
            bucket.items,
            activeBatchItemIdsRef.current
          );
          return {
            ...bucket,
            items: nextItems,
            loadedCount: nextItems.length
          };
        });
      } finally {
        if (activeControllerRef.current === controller) {
          activeControllerRef.current = null;
        }
        setIsGenerating(false);
        activeBatchIdRef.current = "";
        activeBatchItemIdsRef.current = [];
        activeGenerationCountRef.current = DEFAULT_GENERATION_COUNT;
        activeCacheKeyTimestampRef.current = null;
      }
    },
    [activeMediaTab, listingId, updateBucket, videoItems]
  );

  const removeContentItem = React.useCallback((contentItemId: string) => {
    setFilterBuckets((prev) => {
      let didChange = false;
      const next: FilterBuckets = {};

      for (const [filterKey, bucket] of Object.entries(prev)) {
        const nextItems = bucket.items.filter(
          (item) => item.id !== contentItemId
        );
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

      return didChange ? next : prev;
    });
  }, []);

  const replaceContentItem = React.useCallback(
    (params: { previousContentItemId: string; nextItem: ContentItem }) => {
      setFilterBuckets((prev) => {
        let didReplace = false;
        const next: FilterBuckets = {};

        for (const [filterKey, bucket] of Object.entries(prev)) {
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

        return didReplace ? next : prev;
      });
    },
    []
  );

  const currentBucket = filterBuckets[currentFilterKey] ?? getEmptyBucket();
  const loadingCount = isGenerating
    ? Math.max(
        0,
        activeGenerationCountRef.current - activeBatchItemIdsRef.current.length
      )
    : incompleteBatchSkeletonCount;
  const initialPageLoadingCount =
    currentBucket.isLoadingInitialPage && currentBucket.items.length === 0
      ? LISTING_CREATE_INITIAL_PAGE_SIZE
      : 0;

  return {
    localPostItems: currentBucket.items,
    isGenerating,
    generationError,
    loadingCount,
    initialPageLoadingCount,
    generateSubcategoryContent,
    removeContentItem,
    replaceContentItem
  };
}
