import * as React from "react";
import useSWR from "swr";
import {
  countTerminalInBatch,
  fetchListingImages,
  triggerCategorization
} from "../transport";

export const buildPlanProcessingStorageKey = (listingId: string) =>
  `listing-plan-processing:${listingId}`;

export type StoredPlanProcessingBatch = {
  batchImageIds: string[];
  batchStartedAt?: number | null;
};

export function getStoredPlanProcessingBatch(
  listingId: string
): StoredPlanProcessingBatch | null {
  if (typeof window === "undefined") {
    return null;
  }

  const raw = window.sessionStorage.getItem(
    buildPlanProcessingStorageKey(listingId)
  );
  if (!raw) {
    return null;
  }

  try {
    const parsed = JSON.parse(raw) as StoredPlanProcessingBatch;
    if (!Array.isArray(parsed.batchImageIds) || parsed.batchImageIds.length === 0) {
      return null;
    }
    return {
      batchImageIds: parsed.batchImageIds.filter(
        (value): value is string => typeof value === "string" && value.length > 0
      ),
      batchStartedAt:
        typeof parsed.batchStartedAt === "number" ? parsed.batchStartedAt : null
    };
  } catch {
    return null;
  }
}

export function clearStoredPlanProcessingBatch(listingId: string): void {
  if (typeof window === "undefined") {
    return;
  }
  window.sessionStorage.removeItem(buildPlanProcessingStorageKey(listingId));
}

export function usePlanProcessingFlow(params: {
  mode: "plan" | "review" | "generate";
  listingId: string;
  batchImageIds?: string[];
  batchStartedAt?: number | null;
  navigate: (url: string) => void;
}) {
  const { mode, listingId, batchImageIds, batchStartedAt, navigate } = params;
  const storedBatch = React.useMemo(
    () => getStoredPlanProcessingBatch(listingId),
    [listingId]
  );
  const resolvedBatchImageIds = React.useMemo(() => {
    if (Array.isArray(batchImageIds) && batchImageIds.length > 0) {
      return batchImageIds;
    }
    return storedBatch?.batchImageIds ?? [];
  }, [batchImageIds, storedBatch]);
  const resolvedBatchStartedAt =
    batchStartedAt ?? storedBatch?.batchStartedAt ?? null;
  const [isProcessing, setIsProcessing] = React.useState(true);
  const hasTriggeredCategorizeRef = React.useRef(false);
  const completionHandledRef = React.useRef(false);
  const batchSignature = React.useMemo(
    () => resolvedBatchImageIds.join("|"),
    [resolvedBatchImageIds]
  );

  React.useEffect(() => {
    completionHandledRef.current = false;
  }, [batchSignature]);

  React.useEffect(() => {
    if (mode !== "plan" || !listingId.trim()) {
      return;
    }

    const storageKey = buildPlanProcessingStorageKey(listingId);
    if (resolvedBatchImageIds.length === 0) {
      clearStoredPlanProcessingBatch(listingId);
      return;
    }

    window.sessionStorage.setItem(
      storageKey,
      JSON.stringify({
        batchImageIds: resolvedBatchImageIds,
        batchStartedAt: resolvedBatchStartedAt
      })
    );
  }, [listingId, mode, resolvedBatchImageIds, resolvedBatchStartedAt]);

  const { data: images = [] } = useSWR(
    mode === "plan" && isProcessing && resolvedBatchImageIds.length > 0
      ? `/api/v1/listings/${listingId}/images`
      : null,
    () => fetchListingImages(listingId),
    {
      refreshInterval: 1000,
      revalidateOnFocus: false
    }
  );
  const { batchImages, batchTotal, batchCompleted, processingCount, isComplete } =
    React.useMemo(
      () => countTerminalInBatch(images, resolvedBatchImageIds),
      [images, resolvedBatchImageIds]
    );
  const progress = batchTotal > 0 ? batchCompleted / batchTotal : 0;

  React.useEffect(() => {
    if (mode !== "plan") return;
    if (!hasTriggeredCategorizeRef.current && resolvedBatchImageIds.length > 0) {
      hasTriggeredCategorizeRef.current = true;
      setIsProcessing(true);
      void triggerCategorization(listingId).catch(() => null);
    }

    if (!isComplete || completionHandledRef.current) {
      return;
    }
    completionHandledRef.current = true;
    setIsProcessing(false);
    clearStoredPlanProcessingBatch(listingId);
    navigate(`/listings/${listingId}/stage/plan`);
  }, [isComplete, listingId, mode, navigate, resolvedBatchImageIds.length]);

  return {
    isProcessing,
    batchImages,
    batchTotal,
    batchCompleted,
    processingCount,
    progress,
    isComplete,
    batchStartedAt: resolvedBatchStartedAt
  };
}
