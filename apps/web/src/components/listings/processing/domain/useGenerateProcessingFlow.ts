import * as React from "react";
import useSWR from "swr";
import { toast } from "sonner";
import { emitListingSidebarUpdate } from "@web/src/lib/domain/listing/sidebarEvents";
import type { VideoGenerationBatchStatusPayload } from "@web/src/lib/domain/listing/videoStatus";
import {
  getBatchGenerationSoftTimeoutMs,
  isPastTimeout,
  VIDEO_GENERATION_TIMEOUT_MESSAGE
} from "@web/src/lib/domain/listing/videoGenerationTimeouts";
import {
  cancelVideoGeneration,
  fetchVideoStatus,
  startListingContentGeneration,
  startVideoGeneration
} from "./transport";

export function useGenerateProcessingFlow(params: {
  mode: "categorize" | "review" | "generate";
  listingId: string;
  initialBatchId?: string | null;
  navigate: (url: string) => void;
  goToStage: (stage: "review" | "create", path: string) => Promise<void>;
  updateStage: (stage: "review" | "create") => Promise<void>;
}) {
  const { mode, listingId, initialBatchId, navigate, goToStage, updateStage } =
    params;
  const [activeBatchId, setActiveBatchId] = React.useState<string | null>(
    initialBatchId ?? null
  );
  const [generationStatus, setGenerationStatus] =
    React.useState<VideoGenerationBatchStatusPayload | null>(null);
  const [canPollGeneration, setCanPollGeneration] = React.useState(mode !== "generate");
  const [listingContentStatus, setListingContentStatus] = React.useState<
    "idle" | "running" | "succeeded" | "failed"
  >("idle");
  const [remainingEstimateSeconds, setRemainingEstimateSeconds] = React.useState(0);
  const [isCancelOpen, setIsCancelOpen] = React.useState(false);
  const [isCanceling, setIsCanceling] = React.useState(false);

  const hasNavigatedRef = React.useRef(false);
  const hasInitializedGenerationRef = React.useRef(false);
  const hasShownTimeoutRef = React.useRef(false);

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
    const total = generationStatus?.totalJobs ?? 0;
    const failed = generationStatus?.failedJobs ?? 0;
    const canceled = generationStatus?.canceledJobs ?? 0;
    return {
      total,
      terminal:
        (generationStatus?.completedJobs ?? 0) +
        failed +
        canceled,
      failed,
      canceled,
      isTerminal: generationStatus?.isTerminal ?? false,
      allSucceeded: generationStatus?.allSucceeded ?? false
    };
  }, [generationStatus, mode]);

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

  const { data: videoStatus } = useSWR(
    mode === "generate" && canPollGeneration && activeBatchId
      ? `/api/v1/video/status/${activeBatchId}`
      : null,
    () => fetchVideoStatus(activeBatchId as string),
    {
      refreshInterval: 2000,
      revalidateOnFocus: false
    }
  );

  React.useEffect(() => {
    if (mode !== "generate") return;
    if (videoStatus) {
      setGenerationStatus(videoStatus);
    }
  }, [mode, videoStatus]);

  const initializeGeneration = React.useCallback(async () => {
    if (mode !== "generate" || hasInitializedGenerationRef.current) return;
    hasInitializedGenerationRef.current = true;

    const runContent = async () => {
      setListingContentStatus("running");
      try {
        await startListingContentGeneration(listingId);
        setListingContentStatus("succeeded");
      } catch (error) {
        setListingContentStatus("failed");
        throw error;
      }
    };

    try {
      if (activeBatchId) {
        const status = await fetchVideoStatus(activeBatchId);
        if (status) {
          setGenerationStatus(status);

          if (status.failedJobs > 0 || status.canceledJobs > 0) {
            await goToStage("review", `/listings/${listingId}/review`);
            return;
          }

          if (status.allSucceeded && status.isTerminal) {
            try {
              await runContent();
            } catch (error) {
              toast.error(
                error instanceof Error
                  ? error.message
                  : "Failed to generate listing content."
              );
              await goToStage("review", `/listings/${listingId}/review`);
              return;
            }
            await goToStage(
              "create",
              `/listings/${listingId}/create?mediaType=videos&filter=new_listing`
            );
            return;
          }

          if (!status.isTerminal) {
            void runContent().catch((error) => {
              toast.error(
                error instanceof Error
                  ? error.message
                  : "Failed to generate listing content."
              );
            });
            return;
          }
        }
      }

      const contentPromise = runContent().catch((error) => {
        toast.error(
          error instanceof Error
            ? error.message
            : "Failed to generate listing content."
        );
      });

      const startResult = await startVideoGeneration(listingId);
      setActiveBatchId(startResult.batchId);
      setGenerationStatus({
        batchId: startResult.batchId,
        status: "pending",
        createdAt: new Date().toISOString(),
        errorMessage: null,
        totalJobs: startResult.jobCount,
        completedJobs: 0,
        failedJobs: 0,
        canceledJobs: 0,
        processingJobs: 0,
        pendingJobs: startResult.jobCount,
        isTerminal: false,
        allSucceeded: false
      });
      void contentPromise;
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to start generation.");
      await goToStage("review", `/listings/${listingId}/review`);
    }
  }, [activeBatchId, goToStage, listingId, mode]);

  React.useEffect(() => {
    if (mode !== "generate" || !generationStatus || generationStatus.isTerminal) {
      return;
    }

    if (
      hasShownTimeoutRef.current ||
      !isPastTimeout(
        generationStatus.createdAt,
        getBatchGenerationSoftTimeoutMs(generationStatus.totalJobs)
      )
    ) {
      return;
    }

    hasShownTimeoutRef.current = true;
    setCanPollGeneration(false);
    toast.error(VIDEO_GENERATION_TIMEOUT_MESSAGE);
  }, [generationStatus, mode]);

  React.useEffect(() => {
    if (mode === "generate") {
      void initializeGeneration();
      const timeout = setTimeout(() => setCanPollGeneration(true), 30000);
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
  }, [estimatedTotalSeconds, mode]);

  React.useEffect(() => {
    if (mode !== "generate" || generationSummary.isTerminal || remainingEstimateSeconds <= 0) {
      if (generationSummary.isTerminal) {
        setRemainingEstimateSeconds(0);
      }
      return;
    }
    const interval = setInterval(() => {
      setRemainingEstimateSeconds((prev) => Math.max(prev - 1, 0));
    }, 1000);
    return () => clearInterval(interval);
  }, [generationSummary.isTerminal, mode, remainingEstimateSeconds]);

  React.useEffect(() => {
    if (mode !== "generate") return;
    if (!generationSummary.total || !generationSummary.isTerminal || hasNavigatedRef.current) return;

    if (generationSummary.failed > 0 || generationSummary.canceled > 0) {
      hasNavigatedRef.current = true;
      void goToStage("review", `/listings/${listingId}/review`);
      return;
    }

    if (!generationSummary.allSucceeded || listingContentStatus !== "succeeded") {
      if (listingContentStatus === "failed") {
        hasNavigatedRef.current = true;
        void goToStage("review", `/listings/${listingId}/review`);
      }
      return;
    }

    hasNavigatedRef.current = true;
    void goToStage("create", `/listings/${listingId}/create?mediaType=videos&filter=new_listing`);
  }, [generationSummary, goToStage, listingContentStatus, listingId, mode]);

  React.useEffect(() => {
    if (mode !== "generate") return;
    emitListingSidebarUpdate({
      id: listingId,
      listingStage: "generate",
      lastOpenedAt: new Date().toISOString()
    });
  }, [listingId, mode]);

  const handleCancelGeneration = React.useCallback(async () => {
    if (mode !== "generate" || !activeBatchId) return;
    setIsCanceling(true);
    try {
      await cancelVideoGeneration(activeBatchId);
      await updateStage("review");
      emitListingSidebarUpdate({
        id: listingId,
        listingStage: "review",
        lastOpenedAt: new Date().toISOString()
      });
      toast.success("Video generation canceled.");
      navigate(`/listings/${listingId}/review`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to cancel generation.");
    } finally {
      setIsCanceling(false);
      setIsCancelOpen(false);
    }
  }, [activeBatchId, listingId, mode, navigate, updateStage]);

  return {
    isCancelOpen,
    setIsCancelOpen,
    isCanceling,
    formattedEstimate,
    handleCancelGeneration,
    isGenerateMode: mode === "generate"
  };
}
