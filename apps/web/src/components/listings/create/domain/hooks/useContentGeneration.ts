import * as React from "react";
import { toast } from "sonner";
import type { ContentItem } from "@web/src/components/dashboard/ContentGrid";
import type { ListingContentSubcategory } from "@shared/types/models";
import { extractJsonItemsFromStream } from "@web/src/lib/streamParsing";
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
} from "@web/src/components/listings/create/domain/contentGenerationMappers";
import {
  requestContentGenerationStream,
  streamContentGenerationEvents
} from "@web/src/components/listings/create/domain/contentGenerationStream";
import type { StreamedContentItem } from "@web/src/components/listings/create/domain/contentGenerationTypes";

const INITIAL_SKELETON_HOLD_MS = 350;

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
    options?: { forceNewBatch?: boolean }
  ) => Promise<void>;
} {
  const { listingId, listingPostItems, activeMediaTab, activeSubcategory } =
    params;

  const [localPostItems, setLocalPostItems] =
    React.useState<ContentItem[]>(listingPostItems);
  const [isGenerating, setIsGenerating] = React.useState(false);
  const [activeBatchStreamedCount, setActiveBatchStreamedCount] =
    React.useState(0);
  const [holdInitialSkeletons, setHoldInitialSkeletons] = React.useState(false);
  const [incompleteBatchSkeletonCount, setIncompleteBatchSkeletonCount] =
    React.useState(0);
  const [generationError, setGenerationError] = React.useState<string | null>(
    null
  );

  const streamBufferRef = React.useRef("");
  const parsedItemsRef = React.useRef<StreamedContentItem[]>([]);
  const activeControllerRef = React.useRef<AbortController | null>(null);
  const initialSkeletonHoldTimeoutRef = React.useRef<number | null>(null);
  const activeBatchIdRef = React.useRef<string>("");
  const activeBatchItemIdsRef = React.useRef<string[]>([]);

  React.useEffect(() => {
    setIncompleteBatchSkeletonCount(0);
  }, [activeSubcategory, activeMediaTab]);

  const generateSubcategoryContent = React.useCallback(
    async (
      subcategory: ListingContentSubcategory,
      options?: { forceNewBatch?: boolean }
    ) => {
      if (activeControllerRef.current) {
        activeControllerRef.current.abort();
      }
      const controller = new AbortController();
      activeControllerRef.current = controller;
      activeBatchIdRef.current = generateUUID();
      activeBatchItemIdsRef.current = [];
      setIsGenerating(true);
      setActiveBatchStreamedCount(0);
      setIncompleteBatchSkeletonCount(0);
      setHoldInitialSkeletons(true);
      if (initialSkeletonHoldTimeoutRef.current !== null) {
        window.clearTimeout(initialSkeletonHoldTimeoutRef.current);
      }
      initialSkeletonHoldTimeoutRef.current = window.setTimeout(() => {
        setHoldInitialSkeletons(false);
        initialSkeletonHoldTimeoutRef.current = null;
      }, INITIAL_SKELETON_HOLD_MS);
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
              setActiveBatchStreamedCount(
                Math.min(GENERATED_BATCH_SIZE, parsedItems.length)
              );
            }
          }

          if (event.type === "error") {
            throw new Error(event.message);
          }

          if (event.type === "done") {
            didReceiveDone = true;
            setActiveBatchStreamedCount(
              Math.min(GENERATED_BATCH_SIZE, event.items.length)
            );

            const missingCount = Math.max(
              0,
              GENERATED_BATCH_SIZE - event.items.length
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
              mediaType: resolvedMediaType
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
        setIncompleteBatchSkeletonCount(GENERATED_BATCH_SIZE);
        setLocalPostItems((prev) =>
          removeCurrentBatchItems(prev, activeBatchItemIdsRef.current)
        );
      } finally {
        if (activeControllerRef.current === controller) {
          activeControllerRef.current = null;
        }
        if (initialSkeletonHoldTimeoutRef.current !== null) {
          window.clearTimeout(initialSkeletonHoldTimeoutRef.current);
          initialSkeletonHoldTimeoutRef.current = null;
        }
        setHoldInitialSkeletons(false);
        setIsGenerating(false);
        setActiveBatchStreamedCount(0);
        activeBatchIdRef.current = "";
        activeBatchItemIdsRef.current = [];
      }
    },
    [activeMediaTab, listingId]
  );

  React.useEffect(() => {
    return () => {
      if (initialSkeletonHoldTimeoutRef.current !== null) {
        window.clearTimeout(initialSkeletonHoldTimeoutRef.current);
      }
    };
  }, []);

  const loadingCount = isGenerating
    ? holdInitialSkeletons
      ? GENERATED_BATCH_SIZE
      : Math.max(0, GENERATED_BATCH_SIZE - activeBatchStreamedCount)
    : incompleteBatchSkeletonCount;

  return {
    localPostItems,
    isGenerating,
    generationError,
    loadingCount,
    generateSubcategoryContent
  };
}
