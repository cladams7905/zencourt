import * as React from "react";
import { emitListingSidebarUpdate } from "@web/src/lib/domain/listing/sidebarEvents";
import { updateListingStage } from "./transport";
import { useCategorizeProcessingFlow } from "./useCategorizeProcessingFlow";
import { useGenerateProcessingFlow } from "./useGenerateProcessingFlow";
import { useReviewProcessingFlow } from "./useReviewProcessingFlow";

type Mode = "categorize" | "review" | "generate";

export function useListingProcessingWorkflow(params: {
  mode: Mode;
  listingId: string;
  address?: string | null;
  batchStartedAt?: number | null;
  navigate: (url: string) => void;
}) {
  const { mode, listingId, address, batchStartedAt, navigate } = params;

  const updateStage = React.useCallback(
    async (listingStage: "review" | "create") => {
      await updateListingStage(listingId, listingStage);
    },
    [listingId]
  );

  const goToStage = React.useCallback(
    async (stage: "review" | "create", path: string) => {
      try {
        await updateStage(stage);
      } catch {
        // Best effort.
      }
      emitListingSidebarUpdate({
        id: listingId,
        listingStage: stage,
        lastOpenedAt: new Date().toISOString()
      });
      navigate(path);
    },
    [listingId, navigate, updateStage]
  );

  useCategorizeProcessingFlow({
    mode,
    listingId,
    batchStartedAt,
    navigate
  });

  const { status, errorMessage, fetchDetails, handleSkip } = useReviewProcessingFlow({
    mode,
    listingId,
    address,
    navigate,
    updateStage
  });

  const {
    isCancelOpen,
    setIsCancelOpen,
    isCanceling,
    formattedEstimate,
    handleCancelGeneration,
    isGenerateMode
  } = useGenerateProcessingFlow({
    mode,
    listingId,
    navigate,
    goToStage,
    updateStage
  });

  const copy = React.useMemo(() => {
    if (mode === "review") {
      return {
        title: status === "error" ? "Property lookup failed" : "Fetching property details",
        subtitle:
          status === "error"
            ? "We could not fetch IDX details. You can retry or fill in details manually."
            : "We’re pulling public IDX records for review.",
        addressLine: address || "Address on file",
        helperText: "This usually takes a few moments. Please keep this tab open."
      };
    }
    if (mode === "generate") {
      return {
        title: "Generating clips",
        subtitle: "We’re turning your listing photos into short b-roll clips for your reels.",
        addressLine: null,
        helperText: "Keep this tab open. We’ll automatically take you to your clip board when ready."
      };
    }
    return {
      title: "Processing listing photos",
      subtitle: "We’re categorizing your photos so you can review each room quickly.",
      addressLine: null,
      helperText: "This usually takes a few moments. Please keep this tab open."
    };
  }, [address, mode, status]);

  return {
    copy,
    status,
    errorMessage,
    isCancelOpen,
    setIsCancelOpen,
    isCanceling,
    formattedEstimate,
    fetchDetails,
    handleSkip,
    handleCancelGeneration,
    isGenerateMode
  };
}
