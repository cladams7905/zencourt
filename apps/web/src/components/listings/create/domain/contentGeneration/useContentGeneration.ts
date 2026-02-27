import * as React from "react";
import { toast } from "sonner";
import type { ContentItem } from "@web/src/components/dashboard/components/ContentGrid";
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

const DEFAULT_GENERATION_COUNT = GENERATED_BATCH_SIZE;

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
    bodyRevision,
    String(cacheIdentity.cacheKeyTimestamp ?? ""),
    String(cacheIdentity.cacheKeyId ?? "")
  ].join("::");
}

function buildListingPostItemsRevision(items: ContentItem[]): string {
  return items.map(buildContentItemRevision).join("###");
}

const generateUUID = () => {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
};

export function useContentGeneration(params: {
  listingId: string;
  listingPostItems: ContentItem[];
  activeMediaTab: ListingCreateMediaTab;
  activeSubcategory: ListingContentSubcategory;
}): {
  localPostItems: ContentItem[];
  isGenerating: boolean;
  generationError: string | null;
  loadingCount: number;
  generateSubcategoryContent: (
    subcategory: ListingContentSubcategory,
    options?: { forceNewBatch?: boolean; generationCount?: number; templateId?: string }
  ) => Promise<void>;
  removeContentItem: (contentItemId: string) => void;
} {
  const { listingId, listingPostItems, activeMediaTab, activeSubcategory } =
    params;

  const [localPostItems, setLocalPostItems] =
    React.useState<ContentItem[]>(listingPostItems);
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
  const activeGenerationCountRef = React.useRef<number>(DEFAULT_GENERATION_COUNT);
  const lastSyncedServerRevisionRef = React.useRef<string>("");
  const listingPostItemsSnapshot = React.useMemo(
    () => buildListingPostItemsRevision(listingPostItems),
    [listingPostItems]
  );

  React.useEffect(() => {
    setIncompleteBatchSkeletonCount(0);
  }, [activeSubcategory, activeMediaTab]);

  React.useEffect(() => {
    const nextRevision = `${listingId}::${listingPostItemsSnapshot}`;
    if (nextRevision === lastSyncedServerRevisionRef.current) {
      return;
    }
    lastSyncedServerRevisionRef.current = nextRevision;
    setLocalPostItems(listingPostItems);
  }, [listingId, listingPostItems, listingPostItemsSnapshot]);

  const generateSubcategoryContent = React.useCallback(
    async (
      subcategory: ListingContentSubcategory,
      options?: { forceNewBatch?: boolean; generationCount?: number; templateId?: string }
    ) => {
      if (activeControllerRef.current) {
        activeControllerRef.current.abort();
      }
      const controller = new AbortController();
      activeControllerRef.current = controller;
      activeBatchIdRef.current = generateUUID();
      activeBatchItemIdsRef.current = [];
      activeGenerationCountRef.current =
        typeof options?.generationCount === "number" && options.generationCount > 0
          ? options.generationCount
          : DEFAULT_GENERATION_COUNT;
      setIsGenerating(true);
      setIncompleteBatchSkeletonCount(0);
      setGenerationError(null);
      streamBufferRef.current = "";
      parsedItemsRef.current = [];

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
                mediaType: resolvedMediaType
              });

              setLocalPostItems((prev) => [
                ...removeCurrentBatchItems(prev, activeBatchItemIdsRef.current),
                ...streamedContentItems
              ]);
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

            setLocalPostItems((prev) =>
              mergeBatchItems({
                previousItems: prev,
                finalItems,
                batchItemIds: activeBatchItemIdsRef.current,
                forceNewBatch: options?.forceNewBatch
              })
            );
          }
        }

        if (!didReceiveDone) {
          throw new Error("Stream ended before completing output.");
        }
      } catch (error) {
        if ((error as Error).name === "AbortError") {
          setLocalPostItems((prev) =>
            removeCurrentBatchItems(prev, activeBatchItemIdsRef.current)
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
        setLocalPostItems((prev) =>
          removeCurrentBatchItems(prev, activeBatchItemIdsRef.current)
        );
      } finally {
        if (activeControllerRef.current === controller) {
          activeControllerRef.current = null;
        }
        setIsGenerating(false);
        activeBatchIdRef.current = "";
        activeBatchItemIdsRef.current = [];
        activeGenerationCountRef.current = DEFAULT_GENERATION_COUNT;
      }
    },
    [activeMediaTab, listingId]
  );

  const removeContentItem = React.useCallback((contentItemId: string) => {
    setLocalPostItems((prev) => prev.filter((item) => item.id !== contentItemId));
  }, []);

  const loadingCount = isGenerating
    ? activeGenerationCountRef.current
    : incompleteBatchSkeletonCount;

  return {
    localPostItems,
    isGenerating,
    generationError,
    loadingCount,
    generateSubcategoryContent,
    removeContentItem
  };
}
