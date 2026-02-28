import * as React from "react";
import { toast } from "sonner";
import {
  emitListingSidebarHeartbeat,
  emitListingSidebarUpdate
} from "@web/src/lib/domain/listing/sidebarEvents";
import { fetchApiData } from "@web/src/lib/core/http/client";

type UseReviewStageActionsParams = {
  listingId: string;
  navigate: (path: string) => void;
  handleSave: (options?: { silent?: boolean }) => Promise<void>;
};

export const useReviewStageActions = ({
  listingId,
  navigate,
  handleSave
}: UseReviewStageActionsParams) => {
  const [isGoingBack, setIsGoingBack] = React.useState(false);
  const isGoingBackRef = React.useRef(false);

  const updateListingStage = React.useCallback(
    async (listingStage: "categorize" | "generate") => {
      await fetchApiData(`/api/v1/listings/${listingId}/stage`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ listingStage })
      });
    },
    [listingId]
  );

  const handleConfirmContinue = React.useCallback(async () => {
    try {
      await handleSave({ silent: true });
      await updateListingStage("generate");
      emitListingSidebarUpdate({
        id: listingId,
        listingStage: "generate",
        lastOpenedAt: new Date().toISOString()
      });
      navigate(`/listings/${listingId}/generate`);
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "Failed to continue to generation."
      );
    }
  }, [handleSave, listingId, navigate, updateListingStage]);

  const handleGoBack = React.useCallback(async () => {
    if (isGoingBackRef.current) {
      return;
    }
    isGoingBackRef.current = true;
    setIsGoingBack(true);
    try {
      await updateListingStage("categorize");
      emitListingSidebarUpdate({
        id: listingId,
        listingStage: "categorize",
        lastOpenedAt: new Date().toISOString()
      });
      navigate(`/listings/${listingId}/categorize`);
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "Failed to return to categorize stage."
      );
      isGoingBackRef.current = false;
      setIsGoingBack(false);
    }
  }, [listingId, navigate, updateListingStage]);

  React.useEffect(() => {
    emitListingSidebarHeartbeat({
      id: listingId,
      lastOpenedAt: new Date().toISOString()
    });
  }, [listingId]);

  return {
    isGoingBack,
    handleConfirmContinue,
    handleGoBack
  };
};
