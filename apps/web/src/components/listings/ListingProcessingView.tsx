"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { ListingViewHeader } from "./ListingViewHeader";
import { categorizeListingImages } from "@web/src/server/actions/api/vision";
import { getListingImages } from "@web/src/server/actions/db/listings";
import { Loader2 } from "lucide-react";

type ListingProcessingViewProps = {
  listingId: string;
  userId: string;
  title: string;
  batchCount?: number | null;
  batchStartedAt?: number | null;
};

export function ListingProcessingView({
  listingId,
  userId,
  title,
  batchCount,
  batchStartedAt
}: ListingProcessingViewProps) {
  const router = useRouter();
  const [isProcessing, setIsProcessing] = React.useState(true);
  const [totalToProcess, setTotalToProcess] = React.useState<number | null>(
    typeof batchCount === "number" && batchCount > 0 ? batchCount : null
  );
  const [remainingUncategorized, setRemainingUncategorized] = React.useState(
    typeof batchCount === "number" && batchCount > 0 ? batchCount : 0
  );
  const [batchTotal, setBatchTotal] = React.useState(
    typeof batchCount === "number" && batchCount > 0 ? batchCount : 0
  );
  const hasTriggeredCategorizeRef = React.useRef(false);

  const refreshStatus = React.useCallback(async () => {
    try {
      const updated = await getListingImages(userId, listingId);
      if (!hasTriggeredCategorizeRef.current && updated.length > 0) {
        hasTriggeredCategorizeRef.current = true;
        setIsProcessing(true);
        categorizeListingImages(userId, listingId).catch(() => null);
      }
      const isProcessed = (image: { category: string | null }) => {
        const candidate = image as {
          category: string | null;
          confidence?: number | null;
          primaryScore?: number | null;
          features?: string[] | null;
          sceneDescription?: string | null;
        };
        return Boolean(
          candidate.category ||
          candidate.confidence !== null ||
          candidate.primaryScore !== null ||
          (candidate.features && candidate.features.length > 0) ||
          candidate.sceneDescription
        );
      };
      const batchFiltered = batchStartedAt
        ? updated.filter((image) => {
            const uploadedAt =
              typeof image.uploadedAt === "string"
                ? new Date(image.uploadedAt).getTime()
                : (image.uploadedAt?.getTime?.() ?? 0);
            return uploadedAt >= batchStartedAt;
          })
        : updated;
      if (batchFiltered.length === 0) {
        return;
      }
      const processedCount = batchFiltered.filter(isProcessed).length;
      const uncategorizedCount = batchFiltered.length - processedCount;
      setBatchTotal(batchFiltered.length);
      setRemainingUncategorized(uncategorizedCount);
      setTotalToProcess((prev) =>
        prev === null ? batchFiltered.length : prev
      );
      const needsCategorization = batchFiltered.some(
        (image) => !isProcessed(image)
      );
      if (!needsCategorization) {
        setIsProcessing(false);
        router.replace(`/listings/${listingId}`);
      }
    } catch {
      // Ignore polling errors to avoid disrupting the UI.
    }
  }, [listingId, router, batchStartedAt, userId]);

  React.useEffect(() => {
    if (!isProcessing) {
      return;
    }

    void refreshStatus();
    const interval = setInterval(refreshStatus, 1000);
    return () => clearInterval(interval);
  }, [isProcessing, refreshStatus]);

  const resolvedTotal = totalToProcess ?? batchTotal;
  const processedCount = Math.max(
    0,
    resolvedTotal - Math.min(resolvedTotal, remainingUncategorized)
  );

  return (
    <>
      <ListingViewHeader title={title} />
      <div className="mx-auto flex w-full max-w-5xl flex-col gap-10 px-8 py-10">
        <div className="mx-auto w-full max-w-[520px] space-y-6 text-center">
          <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full border border-border bg-secondary/60">
            <Loader2 size={32} className="text-foreground animate-spin" />
          </div>
          <div className="space-y-2">
            <h2 className="text-2xl font-header text-foreground">
              Processing listing photos
            </h2>
            <p className="text-sm text-muted-foreground">
              We&apos;re categorizing your photos so you can review each room
              quickly.
            </p>
          </div>
          <div className="rounded-2xl border border-border bg-secondary p-6 text-left">
            <div className="flex items-center gap-3 text-sm text-foreground">
              <span className="flex h-6 w-6 items-center justify-center rounded-full bg-foreground text-background text-xs">
                ✓
              </span>
              <span className="flex-1">Upload complete</span>
              <span className="text-xs text-muted-foreground">
                {resolvedTotal}/{resolvedTotal}
              </span>
            </div>
            <div className="mt-4 flex items-center gap-3 text-sm text-foreground">
              <div className="flex h-6 w-6 items-center justify-center rounded-full border border-border">
                <Loader2 size={14} className="text-foreground animate-spin" />
              </div>
              <span className="flex-1">Categorizing rooms with AI</span>
              <span className="text-xs text-muted-foreground">
                {processedCount}/{resolvedTotal}
              </span>
            </div>
            <p className="mt-4 text-xs text-muted-foreground">
              This usually takes a few moments. Please keep this tab open.
            </p>
          </div>
        </div>
      </div>
    </>
  );
}
