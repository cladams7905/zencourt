"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { ListingViewHeader } from "./ListingViewHeader";
import { categorizeListingImages } from "@web/src/server/actions/api/vision";
import { fetchListingPropertyDetails } from "@web/src/server/actions/api/listingProperty";
import {
  getListingImages,
  updateListing
} from "@web/src/server/actions/db/listings";
import { AlertTriangle, Loader2 } from "lucide-react";
import { Button } from "../ui/button";
import { toast } from "sonner";
import { emitListingSidebarUpdate } from "@web/src/lib/listingSidebarEvents";
import type { VideoJobUpdateEvent } from "@web/src/types/video-status";

type ListingProcessingViewProps = {
  mode: "categorize" | "review" | "generate";
  listingId: string;
  userId: string;
  title: string;
  address?: string | null;
  batchCount?: number | null;
  batchStartedAt?: number | null;
};

export function ListingProcessingView({
  mode,
  listingId,
  userId,
  title,
  address,
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
  const [generationJobs, setGenerationJobs] = React.useState<
    VideoJobUpdateEvent[]
  >([]);
  const hasTriggeredCategorizeRef = React.useRef(false);
  const hasNavigatedRef = React.useRef(false);
  const [status, setStatus] = React.useState<"loading" | "success" | "error">(
    "loading"
  );
  const [errorMessage, setErrorMessage] = React.useState<string | null>(null);
  const [displayedProgress, setDisplayedProgress] = React.useState(0);

  const resolvedTotal = totalToProcess ?? batchTotal;
  const processedCount = Math.max(
    0,
    resolvedTotal - Math.min(resolvedTotal, remainingUncategorized)
  );

  const generationSummary = React.useMemo(() => {
    if (mode !== "generate") {
      return {
        total: 0,
        completed: 0,
        failed: 0,
        progressPercent: 0,
        isComplete: false
      };
    }
    const total = generationJobs.length;
    const completed = generationJobs.filter((job) =>
      ["completed", "failed", "canceled"].includes(job.status)
    ).length;
    const failed = generationJobs.filter((job) => job.status === "failed")
      .length;
    const progressPercent =
      total > 0 ? Math.round((completed / total) * 100) : 0;
    return {
      total,
      completed,
      failed,
      progressPercent,
      isComplete: total > 0 && completed >= total
    };
  }, [generationJobs, mode]);

  const progressPercent =
    mode === "categorize" && resolvedTotal > 0
      ? Math.round((processedCount / resolvedTotal) * 100)
      : mode === "generate"
        ? generationSummary.progressPercent
        : 0;
  const copy = React.useMemo(() => {
    if (mode === "review") {
      return {
        title:
          status === "error"
            ? "Property lookup failed"
            : "Fetching property details",
        subtitle:
          status === "error"
            ? "We could not fetch IDX details. You can retry or fill in details manually."
            : "We’re pulling public IDX records for review.",
        addressLine: address || "Address on file",
        helperText:
          "This usually takes a few moments. Please keep this tab open."
      };
    }
    if (mode === "generate") {
      return {
        title: "Generating clips",
        subtitle:
          "We’re turning your listing photos into short b-roll clips for your reels.",
        addressLine: null,
        helperText:
          "Keep this tab open. We’ll automatically take you to your clip board when ready."
      };
    }
    return {
      title: "Processing listing photos",
      subtitle:
        "We’re categorizing your photos so you can review each room quickly.",
      addressLine: null,
      helperText: "This usually takes a few moments. Please keep this tab open."
    };
  }, [address, mode, status]);

  const fetchDetails = React.useCallback(async () => {
    if (mode !== "review") {
      return;
    }
    setStatus("loading");
    setErrorMessage(null);
    try {
      await fetchListingPropertyDetails(userId, listingId, address ?? null);
      setStatus("success");
      router.replace(`/listings/${listingId}/review`);
    } catch (error) {
      setStatus("error");
      setErrorMessage(
        error instanceof Error ? error.message : "Failed to fetch details."
      );
    }
  }, [address, listingId, mode, router, userId]);

  const refreshGenerationStatus = React.useCallback(async () => {
    if (mode !== "generate") {
      return;
    }
    try {
      const response = await fetch(`/api/v1/video/status/${listingId}`);
      if (!response.ok) {
        return;
      }
      const payload = (await response.json()) as {
        success: boolean;
        data?: { jobs?: VideoJobUpdateEvent[] };
      };
      if (!payload?.success || !payload.data?.jobs) {
        return;
      }
      setGenerationJobs(payload.data.jobs);
    } catch {
      // Ignore polling errors to avoid disrupting the UI.
    }
  }, [listingId, mode]);

  const refreshStatus = React.useCallback(async () => {
    if (mode !== "categorize") {
      return;
    }
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
        emitListingSidebarUpdate({
          id: listingId,
          lastOpenedAt: new Date().toISOString()
        });
        router.replace(`/listings/${listingId}/categorize`);
      }
    } catch {
      // Ignore polling errors to avoid disrupting the UI.
    }
  }, [listingId, router, batchStartedAt, userId, mode]);

  React.useEffect(() => {
    if (mode === "review") {
      void fetchDetails();
      return;
    }
    if (!isProcessing) {
      return;
    }

    void refreshStatus();
    const interval = setInterval(refreshStatus, 1000);
    return () => clearInterval(interval);
  }, [isProcessing, refreshStatus, mode, fetchDetails]);

  React.useEffect(() => {
    if (mode === "generate") {
      void refreshGenerationStatus();
      const interval = setInterval(refreshGenerationStatus, 2000);
      return () => clearInterval(interval);
    }
    return;
  }, [mode, refreshGenerationStatus]);

  React.useEffect(() => {
    if (mode !== "generate") {
      return;
    }
    if (!generationSummary.total || !generationSummary.isComplete) {
      return;
    }
    if (hasNavigatedRef.current) {
      return;
    }
    hasNavigatedRef.current = true;
    const finalize = async () => {
      try {
        await updateListing(userId, listingId, { listingStage: "create" });
      } catch {
        // Ignore transition failures; navigation will still proceed.
      }
      emitListingSidebarUpdate({
        id: listingId,
        listingStage: "create",
        lastOpenedAt: new Date().toISOString()
      });
      router.replace(`/listings/${listingId}/create`);
    };
    void finalize();
  }, [
    generationSummary.isComplete,
    generationSummary.total,
    listingId,
    mode,
    router,
    userId
  ]);

  React.useEffect(() => {
    if (mode !== "categorize" && mode !== "generate") {
      return;
    }
    setDisplayedProgress(0);
  }, [mode, listingId]);

  React.useEffect(() => {
    if (mode !== "categorize" && mode !== "generate") {
      return;
    }
    setDisplayedProgress((prev) => Math.max(prev, progressPercent));
  }, [mode, progressPercent]);

  React.useEffect(() => {
    if (mode !== "categorize" && mode !== "generate") {
      return;
    }
    if (mode === "categorize" && !isProcessing) {
      return;
    }
    const interval = setInterval(() => {
      setDisplayedProgress((prev) => {
        const target = Math.max(progressPercent, prev);
        const cap = target >= 100 ? 100 : Math.max(target, 95);
        if (prev >= cap) {
          return prev;
        }
        return Math.min(prev + 1, cap);
      });
    }, 500);
    return () => clearInterval(interval);
  }, [isProcessing, mode, progressPercent]);

  React.useEffect(() => {
    if (mode !== "generate") {
      return;
    }
    emitListingSidebarUpdate({
      id: listingId,
      listingStage: "generate",
      lastOpenedAt: new Date().toISOString()
    });
  }, [listingId, mode]);

  const handleSkip = async () => {
    try {
      await updateListing(userId, listingId, { listingStage: "review" });
      router.replace(`/listings/${listingId}/review`);
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to skip fetch."
      );
    }
  };

  return (
    <>
      <ListingViewHeader title={title} />
      <div className="mx-auto flex min-h-[calc(100vh-140px)] w-full max-w-5xl items-center justify-center px-8 py-10">
        <div className="w-full max-w-[520px] space-y-6 text-center bg-background shadow-xs hover:shadow-md transition-all border border-border p-6 rounded-xl">
          <div className="mx-auto mt-2 flex items-center justify-center">
            {mode === "review" && status === "error" ? (
              <AlertTriangle size={32} className="text-destructive" />
            ) : (
              <Loader2 size={40} className="text-foreground animate-spin" />
            )}
          </div>
          <div className="space-y-2">
            <h2 className="text-2xl font-header text-foreground">
              {copy.title}
              {mode === "categorize" || mode === "generate"
                ? ` (${displayedProgress}%)`
                : ""}
            </h2>
            <div className="my-3 gap-3">
              <p className="text-sm text-muted-foreground">{copy.subtitle}</p>
              {copy.addressLine ? (
                <p className="text-xs mt-1 text-muted-foreground">
                  {copy.addressLine}
                </p>
              ) : null}
            </div>
          </div>
          <div className="h-px bg-border w-full" />
          <p className="text-xs text-muted-foreground">{copy.helperText}</p>
          {mode === "review" && status === "error" && errorMessage ? (
            <div className="rounded-lg border border-destructive/20 bg-destructive/10 px-3 py-3 text-xs text-destructive">
              {errorMessage}
            </div>
          ) : null}
          {mode === "review" && status === "error" ? (
            <div className="flex flex-col gap-2">
              <Button onClick={fetchDetails}>Retry fetch</Button>
              <Button variant="outline" onClick={handleSkip}>
                Review manually
              </Button>
            </div>
          ) : null}
        </div>
      </div>
    </>
  );
}
