import * as React from "react";
import { toast } from "sonner";
import { emitListingSidebarUpdate } from "@web/src/lib/domain/listing/sidebarEvents";
import type { VideoJobUpdateEvent } from "@web/src/lib/domain/listing/videoStatus";
import {
  cancelVideoGeneration,
  fetchVideoStatus,
  startListingContentGeneration,
  startVideoGeneration
} from "./transport";

export function useGenerateProcessingFlow(params: {
  mode: "categorize" | "review" | "generate";
  listingId: string;
  navigate: (url: string) => void;
  goToStage: (stage: "review" | "create", path: string) => Promise<void>;
  updateStage: (stage: "review" | "create") => Promise<void>;
}) {
  const { mode, listingId, navigate, goToStage, updateStage } = params;
  const [generationJobs, setGenerationJobs] = React.useState<VideoJobUpdateEvent[]>([]);
  const [canPollGeneration, setCanPollGeneration] = React.useState(mode !== "generate");
  const [listingContentStatus, setListingContentStatus] = React.useState<
    "idle" | "running" | "succeeded" | "failed"
  >("idle");
  const [remainingEstimateSeconds, setRemainingEstimateSeconds] = React.useState(0);
  const [isCancelOpen, setIsCancelOpen] = React.useState(false);
  const [isCanceling, setIsCanceling] = React.useState(false);

  const hasNavigatedRef = React.useRef(false);
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
    const failed = generationJobs.filter((job) => job.status === "failed").length;
    const canceled = generationJobs.filter((job) => job.status === "canceled").length;
    return {
      total,
      terminal,
      failed,
      canceled,
      isTerminal: total > 0 && terminal >= total,
      allSucceeded: total > 0 && generationJobs.every((job) => job.status === "completed")
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

  const refreshGenerationStatus = React.useCallback(async () => {
    if (mode !== "generate") return;
    const { jobs } = await fetchVideoStatus(listingId);
    if (jobs.length > 0) {
      setGenerationJobs(jobs);
    }
  }, [listingId, mode]);

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
      const { jobs } = await fetchVideoStatus(listingId);
      const hasFailedJob = jobs.some((job) => job.status === "failed");
      const hasActiveJob = jobs.some((job) => ["pending", "processing"].includes(job.status));
      const allCompleted = jobs.length > 0 && jobs.every((job) => job.status === "completed");

      if (hasFailedJob) {
        await goToStage("review", `/listings/${listingId}/review`);
        return;
      }

      if (allCompleted) {
        try {
          await runContent();
        } catch (error) {
          toast.error(error instanceof Error ? error.message : "Failed to generate listing content.");
          await goToStage("review", `/listings/${listingId}/review`);
          return;
        }
        await goToStage("create", `/listings/${listingId}/create`);
        return;
      }

      if (hasActiveJob) {
        setGenerationJobs(jobs);
        void runContent().catch((error) => {
          toast.error(error instanceof Error ? error.message : "Failed to generate listing content.");
        });
        return;
      }

      const contentPromise = runContent().catch((error) => {
        toast.error(error instanceof Error ? error.message : "Failed to generate listing content.");
      });

      await startVideoGeneration(listingId);
      void contentPromise;
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to start generation.");
      await goToStage("review", `/listings/${listingId}/review`);
    }
  }, [goToStage, listingId, mode]);

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
    if (mode !== "generate" || !canPollGeneration) return;
    void refreshGenerationStatus();
    const interval = setInterval(refreshGenerationStatus, 2000);
    return () => clearInterval(interval);
  }, [canPollGeneration, mode, refreshGenerationStatus]);

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
    void goToStage("create", `/listings/${listingId}/create`);
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
    if (mode !== "generate") return;
    setIsCanceling(true);
    try {
      await cancelVideoGeneration(listingId);
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
  }, [listingId, mode, navigate, updateStage]);

  return {
    isCancelOpen,
    setIsCancelOpen,
    isCanceling,
    formattedEstimate,
    handleCancelGeneration,
    isGenerateMode: mode === "generate"
  };
}
