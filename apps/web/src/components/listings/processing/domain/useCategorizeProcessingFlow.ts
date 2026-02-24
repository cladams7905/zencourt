import * as React from "react";
import { emitListingSidebarUpdate } from "@web/src/lib/domain/listing/sidebarEvents";
import { fetchListingImages, triggerCategorization } from "./transport";

export function useCategorizeProcessingFlow(params: {
  mode: "categorize" | "review" | "generate";
  listingId: string;
  batchStartedAt?: number | null;
  navigate: (url: string) => void;
}) {
  const { mode, listingId, batchStartedAt, navigate } = params;
  const [isProcessing, setIsProcessing] = React.useState(true);
  const hasTriggeredCategorizeRef = React.useRef(false);

  const refreshCategorizeStatus = React.useCallback(async () => {
    if (mode !== "categorize") return;
    const images = await fetchListingImages(listingId);

    if (!hasTriggeredCategorizeRef.current && images.length > 0) {
      hasTriggeredCategorizeRef.current = true;
      setIsProcessing(true);
      void triggerCategorization(listingId).catch(() => null);
    }

    const isProcessed = (image: {
      category: string | null;
      confidence?: number | null;
      primaryScore?: number | null;
    }) =>
      Boolean(
        image.category &&
          image.confidence !== null &&
          image.confidence !== undefined &&
          image.primaryScore !== null &&
          image.primaryScore !== undefined
      );

    const batchFiltered = batchStartedAt
      ? images.filter((image) => {
          const uploadedAt =
            typeof image.uploadedAt === "string"
              ? new Date(image.uploadedAt).getTime()
              : image.uploadedAt?.getTime?.() ?? 0;
          return uploadedAt >= batchStartedAt;
        })
      : images;

    if (batchFiltered.length === 0) return;

    const needsCategorization = batchFiltered.some((image) => !isProcessed(image));
    if (!needsCategorization) {
      setIsProcessing(false);
      emitListingSidebarUpdate({ id: listingId, lastOpenedAt: new Date().toISOString() });
      navigate(`/listings/${listingId}/categorize`);
    }
  }, [batchStartedAt, listingId, mode, navigate]);

  React.useEffect(() => {
    if (mode !== "categorize" || !isProcessing) return;

    void refreshCategorizeStatus();
    const interval = setInterval(refreshCategorizeStatus, 1000);
    return () => clearInterval(interval);
  }, [isProcessing, mode, refreshCategorizeStatus]);

  return { isProcessing };
}
