"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import type { AddressSelection } from "@web/src/components/location/shared/types";
import {
  createListingForCurrentUser,
  updateListingForCurrentUser
} from "@web/src/server/actions/listings/commands";
import { emitListingSidebarUpdate } from "@web/src/lib/domain/listings/sidebarEvents";

export function useListingAddressFlow() {
  const router = useRouter();
  const [address, setAddress] = React.useState("");
  const [hasConfirmedSelection, setHasConfirmedSelection] =
    React.useState(false);
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
      const listing = await createListingForCurrentUser();
      if (!listing?.id) {
        throw new Error("Draft listing could not be created.");
      }

      await updateListingForCurrentUser(listing.id, {
        title: inferredTitle,
        address: trimmedAddress
      });

      emitListingSidebarUpdate({
        id: listing.id,
        title: inferredTitle,
        listingStage: listing.listingStage ?? "categorize",
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
  }, [address, hasConfirmedSelection, isSubmitting, router]);

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
