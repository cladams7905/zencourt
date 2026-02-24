import * as React from "react";
import { toast } from "sonner";
import { roundBathroomsToHalfStep } from "@web/src/components/listings/review/shared/formatters";
import type { ListingPropertyDetails } from "@shared/types/models";
import { saveListingPropertyDetailsForCurrentUser } from "@web/src/server/actions/propertyDetails/commands";

type UseReviewAutoSaveParams = {
  listingId: string;
  detailsRef: React.MutableRefObject<ListingPropertyDetails>;
  dirtyRef: React.MutableRefObject<boolean>;
  updateDetails: (
    updater: (prev: ListingPropertyDetails) => ListingPropertyDetails
  ) => void;
};

export const useReviewAutoSave = ({
  listingId,
  detailsRef,
  dirtyRef,
  updateDetails
}: UseReviewAutoSaveParams) => {
  const [isSaving, setIsSaving] = React.useState(false);
  const [pendingSave, setPendingSave] = React.useState(false);

  const handleSave = React.useCallback(
    async (options?: { silent?: boolean }) => {
      setIsSaving(true);
      try {
        await saveListingPropertyDetailsForCurrentUser(
          listingId,
          detailsRef.current
        );
        dirtyRef.current = false;
        if (!options?.silent) {
          toast.success("Property details saved.");
        }
      } catch (error) {
        toast.error(
          error instanceof Error ? error.message : "Failed to save details."
        );
      } finally {
        setIsSaving(false);
      }
    },
    [detailsRef, dirtyRef, listingId]
  );

  const triggerAutoSave = React.useCallback(() => {
    if (!dirtyRef.current) {
      return;
    }
    if (isSaving) {
      setPendingSave(true);
      return;
    }
    void handleSave({ silent: true });
  }, [dirtyRef, handleSave, isSaving]);

  React.useEffect(() => {
    if (!isSaving && pendingSave && dirtyRef.current) {
      setPendingSave(false);
      void handleSave({ silent: true });
    }
  }, [dirtyRef, handleSave, isSaving, pendingSave]);

  const normalizeBathrooms = React.useCallback(() => {
    const current = detailsRef.current.bathrooms;
    if (current === null || current === undefined) {
      triggerAutoSave();
      return;
    }
    const rounded = roundBathroomsToHalfStep(current);
    if (rounded !== current) {
      updateDetails((prev) => ({
        ...prev,
        bathrooms: rounded
      }));
      toast.message("Bathrooms rounded to the nearest 0.5.");
      triggerAutoSave();
    } else {
      triggerAutoSave();
    }
  }, [detailsRef, triggerAutoSave, updateDetails]);

  return {
    isSaving,
    handleSave,
    triggerAutoSave,
    normalizeBathrooms
  };
};
