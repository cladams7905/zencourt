import * as React from "react";
import { toast } from "sonner";
import type { ContentItem } from "../../../dashboard/ContentGrid";
import type { ListingContentSubcategory } from "@shared/types/models";
import type { ListingCreateMediaTab } from "./../ListingCreateView";
import { extractJsonItemsFromStream } from "@web/src/lib/streamParsing";

type StreamedContentItem = {
  hook: string;
  body?: { header: string; content: string; broll_query?: string }[] | null;
  caption?: string | null;
  broll_query?: string | null;
};

const SUBCATEGORY_LABELS: Record<ListingContentSubcategory, string> = {
  new_listing: "New Listing",
  open_house: "Open House",
  price_change: "Price Change",
  status_update: "Status Update",
  property_features: "Property Features"
};

const GENERATED_BATCH_SIZE = 4;
const INITIAL_SKELETON_HOLD_MS = 350;

const generateUUID = () => {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
};

export { GENERATED_BATCH_SIZE };

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
        const response = await fetch(
          `/api/v1/listings/${listingId}/content/generate`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              subcategory,
              media_type: resolvedMediaType,
              focus: SUBCATEGORY_LABELS[subcategory],
              generation_nonce: options?.forceNewBatch ? generateUUID() : ""
            }),
            signal: controller.signal
          }
        );

        if (!response.ok) {
          const errorPayload = await response.json().catch(() => ({}));
          throw new Error(
            (errorPayload as { message?: string }).message ||
              "Failed to generate listing post content"
          );
        }

        const reader = response.body?.getReader();
        if (!reader) {
          throw new Error("Streaming response not available");
        }

        const decoder = new TextDecoder();
        let buffer = "";
        let didReceiveDone = false;

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const parts = buffer.split("\n\n");
          buffer = parts.pop() ?? "";

          for (const part of parts) {
            const line = part
              .split("\n")
              .find((entry) => entry.startsWith("data:"));
            if (!line) continue;

            const payload = line.replace(/^data:\s*/, "");
            if (!payload) continue;

            const event = JSON.parse(payload) as
              | { type: "delta"; text: string }
              | {
                  type: "done";
                  items: {
                    hook: string;
                    body?:
                      | {
                          header: string;
                          content: string;
                          broll_query?: string | null;
                        }[]
                      | null;
                    caption?: string | null;
                    broll_query?: string | null;
                  }[];
                }
              | { type: "error"; message: string };

            if (event.type === "delta") {
              streamBufferRef.current += event.text;
              const parsedItems =
                extractJsonItemsFromStream<StreamedContentItem>(
                  streamBufferRef.current
                );

              if (parsedItems.length > parsedItemsRef.current.length) {
                parsedItemsRef.current = parsedItems;

                const streamedContentItems: ContentItem[] = parsedItems.map(
                  (item, absoluteIndex) => {
                    const id =
                      activeBatchItemIdsRef.current[absoluteIndex] ??
                      `generated-${activeBatchIdRef.current}-${absoluteIndex}`;
                    activeBatchItemIdsRef.current[absoluteIndex] = id;
                    return {
                      id,
                      aspectRatio: "square" as const,
                      isFavorite: false,
                      hook: item.hook,
                      caption: item.caption ?? null,
                      body: item.body ?? null,
                      brollQuery: item.broll_query ?? null,
                      listingSubcategory: subcategory,
                      mediaType: resolvedMediaType
                    };
                  }
                );

                setLocalPostItems((prev) => {
                  const currentBatchIds = new Set(
                    activeBatchItemIdsRef.current
                  );
                  const withoutCurrentBatch = prev.filter(
                    (item) => !currentBatchIds.has(item.id)
                  );
                  return [...withoutCurrentBatch, ...streamedContentItems];
                });
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
              // Replace streamed items with the final set from the done event.
              const finalItems: ContentItem[] = event.items.map(
                (item, index) => {
                  const id =
                    activeBatchItemIdsRef.current[index] ??
                    `generated-${activeBatchIdRef.current}-${index}`;
                  return {
                    id,
                    aspectRatio: "square" as const,
                    isFavorite: false,
                    hook: item.hook,
                    caption: item.caption ?? null,
                    body: item.body ?? null,
                    brollQuery: item.broll_query ?? null,
                    listingSubcategory: subcategory,
                    mediaType: resolvedMediaType
                  };
                }
              );

              setLocalPostItems((prev) => {
                const currentBatchIds = new Set(activeBatchItemIdsRef.current);
                const withoutCurrentBatch = prev.filter(
                  (item) => !currentBatchIds.has(item.id)
                );
                if (!options?.forceNewBatch) {
                  const existingIds = new Set(
                    withoutCurrentBatch.map((item) => item.id)
                  );
                  const unique = finalItems.filter(
                    (item) => !existingIds.has(item.id)
                  );
                  return unique.length > 0
                    ? [...withoutCurrentBatch, ...unique]
                    : withoutCurrentBatch;
                }
                return [...withoutCurrentBatch, ...finalItems];
              });
            }
          }
        }

        if (!didReceiveDone) {
          throw new Error("Stream ended before completing output.");
        }
      } catch (error) {
        if ((error as Error).name === "AbortError") {
          setLocalPostItems((prev) => {
            const currentBatchIds = new Set(activeBatchItemIdsRef.current);
            return prev.filter((item) => !currentBatchIds.has(item.id));
          });
          return;
        }
        const message =
          error instanceof Error
            ? error.message
            : "Failed to generate listing content.";
        setGenerationError(message);
        toast.error(message);
        setIncompleteBatchSkeletonCount(GENERATED_BATCH_SIZE);
        // Clean up any streamed items on error.
        setLocalPostItems((prev) => {
          const currentBatchIds = new Set(activeBatchItemIdsRef.current);
          return prev.filter((item) => !currentBatchIds.has(item.id));
        });
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
