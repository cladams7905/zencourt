import * as React from "react";
import { toast } from "sonner";
import { extractJsonItemsFromStream } from "@web/src/lib/streamParsing";
import {
  DEFAULT_AGENT_PROFILE,
  GENERATED_BATCH_SIZE,
  INITIAL_SKELETON_HOLD_MS,
  type DashboardContentCategory,
  type DashboardContentType,
  type DashboardStreamItem,
  type GeneratedContentState
} from "@web/src/components/dashboard/shared";
import {
  mapDoneItemsToContentItems,
  mapStreamItemsToContentItems,
  removeStreamItems,
  replaceStreamItemsWithDoneItems
} from "@web/src/components/dashboard/domain/dashboardContentMappers";
import {
  requestDashboardContentStream,
  streamDashboardContentEvents
} from "@web/src/components/dashboard/domain/dashboardContentStream";

type UseDashboardContentGenerationParams = {
  contentType: DashboardContentType;
  activeFilter: string | null;
  activeCategory: DashboardContentCategory | null;
  hasSelectedFilter: boolean;
  generatedContentItems: GeneratedContentState;
  setGeneratedContentItems: React.Dispatch<React.SetStateAction<GeneratedContentState>>;
  headerName?: string;
  location?: string;
};

export function useDashboardContentGeneration({
  contentType,
  activeFilter,
  activeCategory,
  hasSelectedFilter,
  generatedContentItems,
  setGeneratedContentItems,
  headerName,
  location
}: UseDashboardContentGenerationParams) {
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
  const parsedItemsRef = React.useRef<DashboardStreamItem[]>([]);
  const generatedContentItemsRef = React.useRef(generatedContentItems);
  const activeControllerRef = React.useRef<AbortController | null>(null);
  const initialSkeletonHoldTimeoutRef = React.useRef<number | null>(null);

  React.useEffect(() => {
    generatedContentItemsRef.current = generatedContentItems;
  }, [generatedContentItems]);

  React.useEffect(() => {
    setIncompleteBatchSkeletonCount(0);
  }, [activeCategory, contentType]);

  const generateContent = React.useCallback(
    async (category: DashboardContentCategory, controller?: AbortController) => {
      if (activeControllerRef.current) {
        activeControllerRef.current.abort();
      }

      const localController = controller ?? new AbortController();
      activeControllerRef.current = localController;

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

      const [city, rawState] =
        location?.split(",")?.map((part) => part.trim()) ?? [];
      const state = rawState?.split(" ")[0] ?? "";
      const zipMatch = location?.match(/\b\d{5}(?:-\d{4})?\b/);
      const zipCode = zipMatch?.[0] ?? "";
      const agentProfile = {
        ...DEFAULT_AGENT_PROFILE,
        agent_name: headerName || DEFAULT_AGENT_PROFILE.agent_name,
        city: city || DEFAULT_AGENT_PROFILE.city,
        state: state || DEFAULT_AGENT_PROFILE.state,
        zip_code: zipCode || DEFAULT_AGENT_PROFILE.zip_code
      };

      try {
        const reader = await requestDashboardContentStream({
          category,
          filterFocus: activeFilter ?? "",
          agentProfile,
          signal: localController.signal
        });

        let didReceiveDone = false;

        for await (const event of streamDashboardContentEvents(reader)) {
          if (event.type === "delta") {
            streamBufferRef.current += event.text;
            const parsedItems = extractJsonItemsFromStream<DashboardStreamItem>(
              streamBufferRef.current
            );

            if (parsedItems.length > parsedItemsRef.current.length) {
              const newItems = parsedItems.slice(parsedItemsRef.current.length);
              parsedItemsRef.current = parsedItems;

              const streamedItems = mapStreamItemsToContentItems(newItems);

              setGeneratedContentItems((prev) => {
                const currentItems = prev[contentType]?.[category] ?? [];
                return {
                  ...prev,
                  [contentType]: {
                    ...prev[contentType],
                    [category]: [...currentItems, ...streamedItems]
                  }
                };
              });

              setActiveBatchStreamedCount((prev) =>
                Math.min(GENERATED_BATCH_SIZE, prev + streamedItems.length)
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

            const finalItems = mapDoneItemsToContentItems(event.items);

            setGeneratedContentItems((prev) => {
              const currentItems = prev[contentType]?.[category] ?? [];
              return {
                ...prev,
                [contentType]: {
                  ...prev[contentType],
                  [category]: replaceStreamItemsWithDoneItems(currentItems, finalItems)
                }
              };
            });
          }
        }

        if (!didReceiveDone) {
          throw new Error("Stream ended before completing output.");
        }
      } catch (error) {
        if ((error as Error).name === "AbortError") {
          return;
        }

        const errorMessage = "sorry, an error occurred. Please retry.";
        setGenerationError(errorMessage);
        toast.error("Sorry, an error occurred. Please retry.");
        setIncompleteBatchSkeletonCount(GENERATED_BATCH_SIZE);

        setGeneratedContentItems((prev) => {
          const currentItems = prev[contentType]?.[category] ?? [];
          return {
            ...prev,
            [contentType]: {
              ...prev[contentType],
              [category]: removeStreamItems(currentItems)
            }
          };
        });
      } finally {
        if (activeControllerRef.current === localController) {
          activeControllerRef.current = null;
        }
        if (initialSkeletonHoldTimeoutRef.current !== null) {
          window.clearTimeout(initialSkeletonHoldTimeoutRef.current);
          initialSkeletonHoldTimeoutRef.current = null;
        }
        setHoldInitialSkeletons(false);
        setIsGenerating(false);
        setActiveBatchStreamedCount(0);
      }
    },
    [activeFilter, contentType, headerName, location, setGeneratedContentItems]
  );

  React.useEffect(() => {
    return () => {
      if (initialSkeletonHoldTimeoutRef.current !== null) {
        window.clearTimeout(initialSkeletonHoldTimeoutRef.current);
      }
    };
  }, []);

  React.useEffect(() => {
    if (!hasSelectedFilter || !activeCategory) {
      return;
    }

    const existingItems =
      generatedContentItemsRef.current[contentType]?.[activeCategory] ?? [];
    if (existingItems.length > 0) {
      return;
    }

    const controller = new AbortController();
    void generateContent(activeCategory, controller);

    return () => controller.abort();
  }, [activeCategory, contentType, generateContent, hasSelectedFilter]);

  const activeGeneratedItems = activeCategory
    ? generatedContentItems[contentType]?.[activeCategory] ?? []
    : [];

  const loadingCount = isGenerating
    ? holdInitialSkeletons
      ? GENERATED_BATCH_SIZE
      : Math.max(0, GENERATED_BATCH_SIZE - activeBatchStreamedCount)
    : incompleteBatchSkeletonCount;

  return {
    isGenerating,
    generationError,
    loadingCount,
    activeGeneratedItems,
    generateContent
  };
}
