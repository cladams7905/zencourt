import * as React from "react";
import useSWR from "swr";
import { emitListingSidebarUpdate } from "@web/src/lib/domain/listings/sidebarEvents";
import {
  countTerminalInBatch,
  fetchListingImages,
  triggerCategorization
} from "../transport";

export const buildCategorizeProcessingStorageKey = (listingId: string) =>
  `listing-categorize-processing:${listingId}`;

export type StoredCategorizeProcessingBatch = {
  batchImageIds: string[];
  batchStartedAt?: number | null;
};

export function getStoredCategorizeProcessingBatch(
  listingId: string
): StoredCategorizeProcessingBatch | null {
  if (typeof window === "undefined") {
    return null;
  }

  const raw = window.sessionStorage.getItem(
    buildCategorizeProcessingStorageKey(listingId)
  );
  if (!raw) {
    return null;
  }

  try {
    const parsed = JSON.parse(raw) as StoredCategorizeProcessingBatch;
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

export function clearStoredCategorizeProcessingBatch(listingId: string): void {
  if (typeof window === "undefined") {
    return;
  }
  window.sessionStorage.removeItem(buildCategorizeProcessingStorageKey(listingId));
}

export function useCategorizeProcessingFlow(params: {
  mode: "categorize" | "review" | "generate";
  listingId: string;
  batchImageIds?: string[];
  batchStartedAt?: number | null;
  navigate: (url: string) => void;
}) {
  const { mode, listingId, batchImageIds, batchStartedAt, navigate } = params;
  const storedBatch = React.useMemo(
    () => getStoredCategorizeProcessingBatch(listingId),
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
  const hasNavigatedRef = React.useRef(false);

  React.useEffect(() => {
    if (mode !== "categorize" || !listingId.trim()) {
      return;
    }

    const storageKey = buildCategorizeProcessingStorageKey(listingId);
    if (resolvedBatchImageIds.length === 0) {
      clearStoredCategorizeProcessingBatch(listingId);
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
    mode === "categorize" && isProcessing && resolvedBatchImageIds.length > 0
      ? `/api/v1/listings/${listingId}/images`
      : null,
    () => fetchListingImages(listingId),
    {
      refreshInterval: 1000,
      revalidateOnFocus: false
    }
  );
  const { batchImages, batchTotal, batchCompleted, isComplete } =
    React.useMemo(
      () => countTerminalInBatch(images, resolvedBatchImageIds),
      [images, resolvedBatchImageIds]
    );
  const progress = batchTotal > 0 ? batchCompleted / batchTotal : 0;

  React.useEffect(() => {
    if (mode !== "categorize") return;
    if (!hasTriggeredCategorizeRef.current && resolvedBatchImageIds.length > 0) {
      hasTriggeredCategorizeRef.current = true;
      setIsProcessing(true);
      void triggerCategorization(listingId).catch(() => null);
    }

    if (isComplete && !hasNavigatedRef.current) {
      hasNavigatedRef.current = true;
      setIsProcessing(false);
      clearStoredCategorizeProcessingBatch(listingId);
      emitListingSidebarUpdate({
        id: listingId,
        lastOpenedAt: new Date().toISOString()
      });
      navigate(`/listings/${listingId}/stage/categorize`);
    }
  }, [isComplete, listingId, mode, navigate, resolvedBatchImageIds.length]);

  return {
    isProcessing,
    batchImages,
    batchTotal,
    batchCompleted,
    progress,
    isComplete,
    batchStartedAt: resolvedBatchStartedAt
  };
}
