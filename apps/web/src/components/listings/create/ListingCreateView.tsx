"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { ViewHeader } from "@web/src/components/view/ViewHeader";
import { AddressAutocomplete } from "@web/src/components/location";
import { Button } from "@web/src/components/ui/button";
import {
  createListingForCurrentUser,
  updateListingForCurrentUser
} from "@web/src/server/actions/listings/commands";
import { emitListingSidebarUpdate } from "@web/src/lib/domain/listings/sidebarEvents";

type ListingCreateViewProps = {
  googleMapsApiKey: string;
};

export function ListingCreateView({
  googleMapsApiKey
}: ListingCreateViewProps) {
  const router = useRouter();
  const [address, setAddress] = React.useState("");
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  const handleContinue = React.useCallback(async () => {
    const trimmedAddress = address.trim();
    if (!trimmedAddress || isSubmitting) {
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

      router.push(`/listings/${listing.id}/upload`);
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "Failed to create listing draft."
      );
    } finally {
      setIsSubmitting(false);
    }
  }, [address, isSubmitting, router]);

  return (
    <>
      <ViewHeader
        title="Create listing"
        subtitle="Start by entering the property address."
      />
      <div className="mx-auto flex w-full max-w-3xl flex-col gap-6 px-8 py-10">
        <section className="space-y-4 rounded-lg border border-border bg-secondary p-6">
          <h2 className="text-lg font-medium text-foreground">
            Step 1: Address
          </h2>
          <p className="text-sm text-muted-foreground">
            We use this to title the listing and power downstream listing
            details.
          </p>
          <div className="space-y-2">
            <label className="text-sm text-foreground">Listing address</label>
            <AddressAutocomplete
              placeholder="123 Market Street, Seattle WA"
              value={address}
              onChange={setAddress}
              apiKey={googleMapsApiKey}
              onSelectAddress={(selection) => {
                const nextAddress = selection.formattedAddress?.trim();
                if (nextAddress) {
                  setAddress(nextAddress);
                }
              }}
            />
          </div>
          <div className="flex justify-end">
            <Button
              type="button"
              onClick={() => {
                void handleContinue();
              }}
              disabled={!address.trim() || isSubmitting}
            >
              {isSubmitting ? "Creating..." : "Continue to upload"}
            </Button>
          </div>
        </section>
      </div>
    </>
  );
}
