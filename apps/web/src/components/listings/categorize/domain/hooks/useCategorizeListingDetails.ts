"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { emitListingSidebarUpdate } from "@web/src/lib/domain/listing/sidebarEvents";
import { updateListing } from "@web/src/server/actions/db/listings";

type RunDraftSave = <T>(fn: () => Promise<T>) => Promise<T>;

type AddressSelection = {
  formattedAddress?: string | null;
};

type UseCategorizeListingDetailsParams = {
  title: string;
  initialAddress: string;
  hasPropertyDetails: boolean;
  listingId: string;
  userId: string;
  runDraftSave: RunDraftSave;
};

const buildAddressUpdatePayload = (
  nextAddress: string,
  previousAddress: string
): {
  shouldClearDetails: boolean;
  payload: Parameters<typeof updateListing>[2];
} => {
  const shouldClearDetails =
    nextAddress !== previousAddress && nextAddress.length > 0;

  return {
    shouldClearDetails,
    payload: {
      address: nextAddress,
      propertyDetails: shouldClearDetails ? null : undefined,
      propertyDetailsSource: shouldClearDetails ? null : undefined,
      propertyDetailsFetchedAt: shouldClearDetails ? null : undefined,
      propertyDetailsRevision: shouldClearDetails ? null : undefined
    }
  };
};

export function useCategorizeListingDetails({
  title,
  initialAddress,
  hasPropertyDetails,
  listingId,
  userId,
  runDraftSave
}: UseCategorizeListingDetailsParams) {
  const router = useRouter();
  const [draftTitle, setDraftTitle] = React.useState(title);
  const [addressValue, setAddressValue] = React.useState(initialAddress);
  const [hasPropertyDetailsState, setHasPropertyDetailsState] =
    React.useState(hasPropertyDetails);
  const draftTitleRef = React.useRef(title);
  const lastSavedAddressRef = React.useRef(initialAddress.trim());

  React.useEffect(() => {
    draftTitleRef.current = draftTitle;
  }, [draftTitle]);

  const persistListingTitle = React.useCallback(
    async (nextTitle: string) => {
      const previous = draftTitleRef.current;
      setDraftTitle(nextTitle);
      try {
        await runDraftSave(() =>
          updateListing(userId, listingId, { title: nextTitle })
        );
        emitListingSidebarUpdate({
          id: listingId,
          title: nextTitle,
          lastOpenedAt: new Date().toISOString()
        });
        return true;
      } catch (error) {
        setDraftTitle(previous);
        toast.error(
          (error as Error).message || "Failed to update listing name."
        );
        return false;
      }
    },
    [listingId, runDraftSave, userId]
  );

  const persistAddress = React.useCallback(
    async (nextAddress: string, errorMessage: string) => {
      const previousAddress = lastSavedAddressRef.current;
      const { shouldClearDetails, payload } = buildAddressUpdatePayload(
        nextAddress,
        previousAddress
      );

      try {
        await runDraftSave(() =>
          updateListing(userId, listingId, payload)
        );
        lastSavedAddressRef.current = nextAddress;
        if (shouldClearDetails) {
          setHasPropertyDetailsState(false);
        }
        return true;
      } catch (error) {
        toast.error((error as Error).message || errorMessage);
        return false;
      }
    },
    [listingId, runDraftSave, userId]
  );

  const handleAddressSelect = React.useCallback(
    (selection: AddressSelection) => {
      const nextTitle = selection.formattedAddress?.split(",")[0]?.trim() || "";
      if (nextTitle) {
        void persistListingTitle(nextTitle);
      }
      if (!selection.formattedAddress) {
        return;
      }
      const nextAddress = selection.formattedAddress.trim();
      setAddressValue(nextAddress);
      void persistAddress(nextAddress, "Failed to update listing address.");
    },
    [persistAddress, persistListingTitle]
  );

  const handleContinue = React.useCallback(async () => {
    const nextAddress = addressValue.trim();
    if (nextAddress) {
      const saved = await persistAddress(
        nextAddress,
        "Failed to save listing address."
      );
      if (!saved) {
        return;
      }
    }

    try {
      await updateListing(userId, listingId, {
        listingStage: "review"
      });
      emitListingSidebarUpdate({
        id: listingId,
        listingStage: "review",
        lastOpenedAt: new Date().toISOString()
      });
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "Failed to continue to review."
      );
      return;
    }

    if (hasPropertyDetailsState) {
      router.push(`/listings/${listingId}/review`);
      return;
    }

    router.push(`/listings/${listingId}/review/processing`);
  }, [
    addressValue,
    hasPropertyDetailsState,
    listingId,
    persistAddress,
    router,
    userId
  ]);

  return {
    draftTitle,
    addressValue,
    hasPropertyDetailsState,
    setAddressValue,
    persistListingTitle,
    handleAddressSelect,
    handleContinue
  };
}
