"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import type { AddressSelection } from "@web/src/components/location/shared/types";
import {
  createListingForCurrentUser,
  touchListingActivityForCurrentUser,
  updateListingForCurrentUser
} from "@web/src/server/actions/listings/commands";
import { emitListingSidebarUpdate } from "@web/src/lib/domain/listings/sidebarEvents";

export type UseListingAddressFlowOptions = {
  prefilledListingId?: string | null;
  initialAddressFromListing?: string | null;
};

export function useListingAddressFlow(options?: UseListingAddressFlowOptions) {
  const prefilledListingId = options?.prefilledListingId?.trim() ?? null;
  const initialFromListing = options?.initialAddressFromListing?.trim() ?? "";

  const router = useRouter();
  const [address, setAddress] = React.useState(() => initialFromListing);
  const [hasConfirmedSelection, setHasConfirmedSelection] = React.useState(
    () => Boolean(prefilledListingId && initialFromListing)
  );
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  const handleAddressChange = React.useCallback((next: string) => {
    setAddress(next);
    setHasConfirmedSelection(false);
  }, []);

  const handleAddressSelect = React.useCallback(
    (selection: AddressSelection) => {
      const nextAddress = selection.formattedAddress?.trim();
      if (nextAddress) {
        setAddress(nextAddress);
        setHasConfirmedSelection(true);
      }
    },
    []
  );

  const handleContinue = React.useCallback(async () => {
    const trimmedAddress = address.trim();
    if (!trimmedAddress || !hasConfirmedSelection || isSubmitting) {
      return;
    }

    const inferredTitle = trimmedAddress.split(",")[0]?.trim() || "Listing";

    setIsSubmitting(true);
    try {
      if (prefilledListingId) {
        const updated = await updateListingForCurrentUser(prefilledListingId, {
          title: inferredTitle,
          address: trimmedAddress,
          listingStage: "upload"
        });
        await touchListingActivityForCurrentUser(prefilledListingId);

        emitListingSidebarUpdate({
          id: prefilledListingId,
          title: inferredTitle,
          listingStage: updated.listingStage ?? "upload",
          lastOpenedAt: new Date().toISOString()
        });

        router.push(`/listings/${prefilledListingId}/stage/upload`);
        return;
      }

      const listing = await createListingForCurrentUser();
      if (!listing?.id) {
        throw new Error("Draft listing could not be created.");
      }

      const updated = await updateListingForCurrentUser(listing.id, {
        title: inferredTitle,
        address: trimmedAddress,
        listingStage: "upload"
      });
      await touchListingActivityForCurrentUser(listing.id);

      emitListingSidebarUpdate({
        id: listing.id,
        title: inferredTitle,
        listingStage: updated.listingStage ?? "upload",
        lastOpenedAt: new Date().toISOString()
      });

      router.push(`/listings/${listing.id}/stage/upload`);
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "Failed to create listing draft."
      );
    } finally {
      setIsSubmitting(false);
    }
  }, [address, hasConfirmedSelection, isSubmitting, prefilledListingId, router]);

  const canContinue = Boolean(address.trim()) && hasConfirmedSelection;
  const showSelectionHint = Boolean(address.trim()) && !hasConfirmedSelection;

  return {
    address,
    handleAddressChange,
    handleAddressSelect,
    canContinue,
    isSubmitting,
    handleContinue,
    showSelectionHint
  };
}
