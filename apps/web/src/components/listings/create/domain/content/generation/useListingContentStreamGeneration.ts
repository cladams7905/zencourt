"use client";

import * as React from "react";
import { toast } from "sonner";
import type { ListingContentItem as ContentItem } from "@web/src/lib/domain/listings/content";
import type { ListingContentSubcategory } from "@shared/types/models";
import { extractJsonItemsFromStream } from "@web/src/lib/sse/contentExtractor";
import {
  GENERATED_BATCH_SIZE,
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
import { buildFilterKey } from "../items/filterBuckets";
import { buildListingCreatePreviewPlans } from "../../usePreviewPlans";
import type { FilterBucket } from "../items/filterBuckets";
import {
  removeBatchItemsFromBucket,
  settleBucketItems
} from "./stateTransitions";

const DEFAULT_GENERATION_COUNT = GENERATED_BATCH_SIZE;
type ListingClipItem = ContentItem;

function generateUUID() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

export function useListingContentStreamGeneration(params: {
  listingId: string;
  activeMediaTab: ListingCreateMediaTab;
  activeSubcategory: ListingContentSubcategory;
  listingClipItems: ListingClipItem[];
  activeControllerRef: React.MutableRefObject<AbortController | null>;
  activeGeneratingFilterKeyRef: React.MutableRefObject<string | null>;
  updateBucket: (
    filterKey: string,
    updater: (bucket: FilterBucket) => FilterBucket
  ) => void;
}) {
  const {
    listingId,
    activeMediaTab,
    activeSubcategory,
    listingClipItems,
    activeControllerRef,
    activeGeneratingFilterKeyRef,
    updateBucket
  } = params;

  const [isGenerating, setIsGenerating] = React.useState(false);
  const [incompleteBatchSkeletonCount, setIncompleteBatchSkeletonCount] =
    React.useState(0);
  const [generationError, setGenerationError] = React.useState<string | null>(
    null
  );

  const streamBufferRef = React.useRef("");
  const parsedItemsRef = React.useRef<StreamedContentItem[]>([]);
  const activeBatchIdRef = React.useRef<string>("");
  const activeBatchItemIdsRef = React.useRef<string[]>([]);
  const activeGenerationCountRef = React.useRef<number>(
    DEFAULT_GENERATION_COUNT
  );
  const activeCacheKeyTimestampRef = React.useRef<number | null>(null);

  React.useEffect(() => {
    setIncompleteBatchSkeletonCount(0);
  }, [activeMediaTab, activeSubcategory]);

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
      activeGeneratingFilterKeyRef.current = targetFilterKey;
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

              updateBucket(targetFilterKey, (bucket) =>
                settleBucketItems(bucket, [
                  ...removeCurrentBatchItems(
                    bucket.items,
                    activeBatchItemIdsRef.current
                  ),
                  ...streamedContentItems
                ])
              );
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
                      activeContentItems: [item],
                      listingClipItems
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
              return settleBucketItems(bucket, nextItems);
            });
          }
        }

        if (!didReceiveDone) {
          throw new Error("Stream ended before completing output.");
        }
      } catch (error) {
        if ((error as Error).name === "AbortError") {
          updateBucket(targetFilterKey, (bucket) =>
            removeBatchItemsFromBucket(bucket, activeBatchItemIdsRef.current)
          );
          return;
        }
        const message =
          error instanceof Error
            ? error.message
            : "Failed to generate listing content.";
        setGenerationError(message);
        toast.error(message);
        setIncompleteBatchSkeletonCount(activeGenerationCountRef.current);
        updateBucket(targetFilterKey, (bucket) =>
          removeBatchItemsFromBucket(bucket, activeBatchItemIdsRef.current)
        );
      } finally {
        if (activeControllerRef.current === controller) {
          activeControllerRef.current = null;
        }
        setIsGenerating(false);
        activeBatchIdRef.current = "";
        activeBatchItemIdsRef.current = [];
        activeGenerationCountRef.current = DEFAULT_GENERATION_COUNT;
        activeCacheKeyTimestampRef.current = null;
        activeGeneratingFilterKeyRef.current = null;
      }
    },
    [
      activeControllerRef,
      activeGeneratingFilterKeyRef,
      activeMediaTab,
      listingClipItems,
      listingId,
      updateBucket
    ]
  );

  const loadingCount = isGenerating
    ? Math.max(
        0,
        activeGenerationCountRef.current - activeBatchItemIdsRef.current.length
      )
    : incompleteBatchSkeletonCount;

  return {
    generateSubcategoryContent,
    generationError,
    isGenerating,
    loadingCount
  };
}
