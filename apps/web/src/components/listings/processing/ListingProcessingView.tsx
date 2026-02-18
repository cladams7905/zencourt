"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { ListingViewHeader } from "@web/src/components/listings/shared";
import { categorizeListingImages } from "@web/src/server/actions/api/vision";
import { fetchListingPropertyDetails } from "@web/src/server/actions/api/listingProperty";
import {
  getListingImages,
  updateListing
} from "@web/src/server/actions/db/listings";
import { AlertTriangle, Loader2 } from "lucide-react";
import { Button } from "../../ui/button";
import { toast } from "sonner";
import { emitListingSidebarUpdate } from "@web/src/lib/domain/listing/sidebarEvents";
import type { VideoJobUpdateEvent } from "@web/src/types/video-status";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from "../../ui/dialog";

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
  batchStartedAt
}: ListingProcessingViewProps) {
  const router = useRouter();
  const [isProcessing, setIsProcessing] = React.useState(true);
  const [generationJobs, setGenerationJobs] = React.useState<
    VideoJobUpdateEvent[]
  >([]);
  const hasTriggeredCategorizeRef = React.useRef(false);
  const hasNavigatedRef = React.useRef(false);
  const [status, setStatus] = React.useState<"loading" | "success" | "error">(
    "loading"
  );
  const [errorMessage, setErrorMessage] = React.useState<string | null>(null);
  const [isCancelOpen, setIsCancelOpen] = React.useState(false);
  const [isCanceling, setIsCanceling] = React.useState(false);
  const [canPollGeneration, setCanPollGeneration] = React.useState(
    mode !== "generate"
  );
  const [listingContentStatus, setListingContentStatus] = React.useState<
    "idle" | "running" | "succeeded" | "failed"
  >("idle");
  const [remainingEstimateSeconds, setRemainingEstimateSeconds] =
    React.useState(0);
  const hasInitializedGenerationRef = React.useRef(false);

  const generationSummary = React.useMemo(() => {
    if (mode !== "generate") {
      return {
        total: 0,
        terminal: 0,
        failed: 0,
        canceled: 0,
        isTerminal: false,
        allSucceeded: false
      };
    }
    const total = generationJobs.length;
    const terminal = generationJobs.filter((job) =>
      ["completed", "failed", "canceled"].includes(job.status)
    ).length;
    const failed = generationJobs.filter(
      (job) => job.status === "failed"
    ).length;
    const canceled = generationJobs.filter(
      (job) => job.status === "canceled"
    ).length;
    return {
      total,
      terminal,
      failed,
      canceled,
      isTerminal: total > 0 && terminal >= total,
      allSucceeded:
        total > 0 && generationJobs.every((job) => job.status === "completed")
    };
  }, [generationJobs, mode]);

  const estimatedTotalSeconds = React.useMemo(() => {
    if (mode !== "generate") {
      return 0;
    }
    return generationSummary.total > 0 ? generationSummary.total * 10 : 90;
  }, [generationSummary.total, mode]);

  const formattedEstimate = React.useMemo(() => {
    const minutes = Math.floor(remainingEstimateSeconds / 60);
    const seconds = remainingEstimateSeconds % 60;
    return `${minutes}:${seconds.toString().padStart(2, "0")}`;
  }, [remainingEstimateSeconds]);
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

  const initializeGeneration = React.useCallback(async () => {
    if (mode !== "generate" || hasInitializedGenerationRef.current) {
      return;
    }
    hasInitializedGenerationRef.current = true;

    const startListingContentGeneration = async () => {
      setListingContentStatus("running");
      const response = await fetch(
        `/api/v1/listings/${listingId}/content/generate`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ subcategory: "new_listing" })
        }
      );
      if (!response.ok) {
        const payload = await response.json().catch(() => ({}));
        setListingContentStatus("failed");
        throw new Error(
          payload?.message ||
            payload?.error ||
            "Failed to generate listing content."
        );
      }
      setListingContentStatus("succeeded");
    };

    const startVideoGeneration = async () => {
      const response = await fetch(`/api/v1/video/generate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ listingId })
      });
      if (!response.ok) {
        const payload = await response.json().catch(() => ({}));
        throw new Error(
          payload?.message || payload?.error || "Failed to start generation."
        );
      }
    };

    try {
      const statusResponse = await fetch(`/api/v1/video/status/${listingId}`);
      if (statusResponse.ok) {
        const statusPayload = (await statusResponse.json()) as {
          success: boolean;
          data?: { jobs?: VideoJobUpdateEvent[] };
        };
        const jobs = statusPayload.data?.jobs ?? [];
        const hasFailedJob = jobs.some((job) => job.status === "failed");
        const hasActiveJob = jobs.some((job) =>
          ["pending", "processing"].includes(job.status)
        );
        const allCompleted =
          jobs.length > 0 && jobs.every((job) => job.status === "completed");

        if (hasFailedJob) {
          await updateListing(userId, listingId, { listingStage: "review" });
          emitListingSidebarUpdate({
            id: listingId,
            listingStage: "review",
            lastOpenedAt: new Date().toISOString()
          });
          router.replace(`/listings/${listingId}/review`);
          return;
        }

        if (allCompleted) {
          try {
            await startListingContentGeneration();
          } catch (error) {
            toast.error(
              error instanceof Error
                ? error.message
                : "Failed to generate listing content."
            );
            await updateListing(userId, listingId, { listingStage: "review" });
            emitListingSidebarUpdate({
              id: listingId,
              listingStage: "review",
              lastOpenedAt: new Date().toISOString()
            });
            router.replace(`/listings/${listingId}/review`);
            return;
          }
          await updateListing(userId, listingId, { listingStage: "create" });
          emitListingSidebarUpdate({
            id: listingId,
            listingStage: "create",
            lastOpenedAt: new Date().toISOString()
          });
          router.replace(`/listings/${listingId}/create`);
          return;
        }

        if (hasActiveJob) {
          setGenerationJobs(jobs);
          void startListingContentGeneration().catch((error) => {
            toast.error(
              error instanceof Error
                ? error.message
                : "Failed to generate listing content."
            );
          });
          return;
        }
      }

      const listingContentPromise = startListingContentGeneration().catch(
        (error) => {
          toast.error(
            error instanceof Error
              ? error.message
              : "Failed to generate listing content."
          );
          setListingContentStatus("failed");
        }
      );

      await startVideoGeneration();
      void listingContentPromise;
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to start generation."
      );
      try {
        await updateListing(userId, listingId, { listingStage: "review" });
        emitListingSidebarUpdate({
          id: listingId,
          listingStage: "review",
          lastOpenedAt: new Date().toISOString()
        });
      } catch {
        // Ignore stage update failures.
      }
      router.replace(`/listings/${listingId}/review`);
    }
  }, [listingId, mode, router, userId]);

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
        };
        return Boolean(
          candidate.category &&
            candidate.confidence !== null &&
            candidate.confidence !== undefined &&
            candidate.primaryScore !== null &&
            candidate.primaryScore !== undefined
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
      void initializeGeneration();
      const timeout = setTimeout(() => {
        setCanPollGeneration(true);
      }, 30000);
      return () => clearTimeout(timeout);
    }
    setCanPollGeneration(true);
  }, [initializeGeneration, mode]);

  React.useEffect(() => {
    if (mode !== "generate") {
      setRemainingEstimateSeconds(0);
      return;
    }
    setRemainingEstimateSeconds(estimatedTotalSeconds);
  }, [estimatedTotalSeconds, listingId, mode]);

  React.useEffect(() => {
    if (mode !== "generate") {
      return;
    }
    if (generationSummary.isTerminal) {
      setRemainingEstimateSeconds(0);
      return;
    }
    if (remainingEstimateSeconds <= 0) {
      return;
    }
    const interval = setInterval(() => {
      setRemainingEstimateSeconds((prev) => Math.max(prev - 1, 0));
    }, 1000);
    return () => clearInterval(interval);
  }, [generationSummary.isTerminal, mode, remainingEstimateSeconds]);

  React.useEffect(() => {
    if (mode === "generate" && canPollGeneration) {
      void refreshGenerationStatus();
      const interval = setInterval(refreshGenerationStatus, 2000);
      return () => clearInterval(interval);
    }
    return;
  }, [canPollGeneration, mode, refreshGenerationStatus]);

  React.useEffect(() => {
    if (mode !== "generate") {
      return;
    }
    if (!generationSummary.total || !generationSummary.isTerminal) {
      return;
    }
    if (hasNavigatedRef.current) {
      return;
    }
    if (generationSummary.failed > 0 || generationSummary.canceled > 0) {
      hasNavigatedRef.current = true;
      const fallbackToReview = async () => {
        try {
          await updateListing(userId, listingId, { listingStage: "review" });
        } catch {
          // Ignore transition failures; navigation will still proceed.
        }
        emitListingSidebarUpdate({
          id: listingId,
          listingStage: "review",
          lastOpenedAt: new Date().toISOString()
        });
        router.replace(`/listings/${listingId}/review`);
      };
      void fallbackToReview();
      return;
    }
    if (
      !generationSummary.allSucceeded ||
      listingContentStatus !== "succeeded"
    ) {
      if (listingContentStatus === "failed") {
        hasNavigatedRef.current = true;
        const fallbackToReview = async () => {
          try {
            await updateListing(userId, listingId, { listingStage: "review" });
          } catch {
            // Ignore transition failures; navigation will still proceed.
          }
          emitListingSidebarUpdate({
            id: listingId,
            listingStage: "review",
            lastOpenedAt: new Date().toISOString()
          });
          router.replace(`/listings/${listingId}/review`);
        };
        void fallbackToReview();
      }
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
    generationSummary.allSucceeded,
    generationSummary.canceled,
    generationSummary.failed,
    generationSummary.isTerminal,
    generationSummary.total,
    listingId,
    listingContentStatus,
    mode,
    router,
    userId
  ]);

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

  const handleCancelGeneration = async () => {
    if (mode !== "generate") {
      return;
    }
    setIsCanceling(true);
    try {
      const response = await fetch(`/api/v1/video/cancel/${listingId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason: "Canceled by user" })
      });
      if (!response.ok) {
        const payload = await response.json().catch(() => ({}));
        throw new Error(
          payload?.message || payload?.error || "Failed to cancel generation."
        );
      }
      await updateListing(userId, listingId, { listingStage: "review" });
      emitListingSidebarUpdate({
        id: listingId,
        listingStage: "review",
        lastOpenedAt: new Date().toISOString()
      });
      toast.success("Video generation canceled.");
      router.replace(`/listings/${listingId}/review`);
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to cancel generation."
      );
    } finally {
      setIsCanceling(false);
      setIsCancelOpen(false);
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
          {mode === "generate" ? (
            <p className="text-xs text-muted-foreground font-semibold">
              Estimated time remaining: {formattedEstimate}
            </p>
          ) : null}
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
          {mode === "generate" ? (
            <div className="flex justify-center">
              <Button variant="outline" onClick={() => setIsCancelOpen(true)}>
                Cancel generation
              </Button>
            </div>
          ) : null}
        </div>
      </div>
      <Dialog open={isCancelOpen} onOpenChange={setIsCancelOpen}>
        <DialogContent className="sm:max-w-[420px]">
          <DialogHeader>
            <DialogTitle>Cancel video generation?</DialogTitle>
            <DialogDescription>
              This will stop all in-flight video jobs for this listing. You can
              restart generation later.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              type="button"
              variant="ghost"
              onClick={() => setIsCancelOpen(false)}
              disabled={isCanceling}
            >
              Keep running
            </Button>
            <Button
              type="button"
              variant="destructive"
              onClick={handleCancelGeneration}
              disabled={isCanceling}
            >
              {isCanceling ? "Canceling..." : "Cancel generation"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
