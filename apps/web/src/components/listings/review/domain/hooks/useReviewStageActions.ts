import * as React from "react";
import { toast } from "sonner";
import { updateListing } from "@web/src/server/actions/db/listings";
import { emitListingSidebarUpdate } from "@web/src/lib/listingSidebarEvents";

type UseReviewStageActionsParams = {
  listingId: string;
  userId: string;
  navigate: (path: string) => void;
  handleSave: (options?: { silent?: boolean }) => Promise<void>;
};

export const useReviewStageActions = ({
  listingId,
  userId,
  navigate,
  handleSave
}: UseReviewStageActionsParams) => {
  const [isGoingBack, setIsGoingBack] = React.useState(false);

  const handleConfirmContinue = React.useCallback(async () => {
    try {
      await handleSave({ silent: true });
      await updateListing(userId, listingId, { listingStage: "generate" });
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
  }, [handleSave, listingId, navigate, userId]);

  const handleGoBack = React.useCallback(async () => {
    setIsGoingBack(true);
    try {
      await updateListing(userId, listingId, { listingStage: "categorize" });
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
      setIsGoingBack(false);
    }
  }, [listingId, navigate, userId]);

  React.useEffect(() => {
    emitListingSidebarUpdate({
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
