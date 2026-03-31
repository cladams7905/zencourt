"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { AddressAutocomplete } from "@web/src/components/location";
import {
  ListingStageFooter,
  ListingStageScaffold,
  buildListingStageFlowSteps
} from "@web/src/components/listings/stage";
import { ViewHeader } from "@web/src/components/view/ViewHeader";
import {
  createListingForCurrentUser,
  updateListingForCurrentUser
} from "@web/src/server/actions/listings/commands";
import { emitListingSidebarUpdate } from "@web/src/lib/domain/listings/sidebarEvents";
import { Label } from "../../../ui/label";

type ListingAddressViewProps = {
  googleMapsApiKey: string;
};

export function ListingAddressView({
  googleMapsApiKey
}: ListingAddressViewProps) {
  const timelineSteps = buildListingStageFlowSteps("address");

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
  }, [address, isSubmitting, router]);

  return (
    <div className="flex h-full min-h-full flex-col">
      <ViewHeader
        title="Create listing"
        subtitle="Start by entering the property address."
        hideCreateButton
      />
      <div className="mx-auto flex min-h-0 w-full flex-1 items-stretch bg-background px-8 pb-10 pt-0 md:pt-10">
        <ListingStageScaffold
          steps={timelineSteps}
          stepTitle="Step 1: Enter Listing Address"
          stepSubtitle="We use this to title the listing and populate listing details."
          footer={
            <ListingStageFooter
              onContinue={() => {
                void handleContinue();
              }}
              canContinue={Boolean(address.trim())}
              isSubmitting={isSubmitting}
            />
          }
        >
          <div className="w-full space-y-2 pt-8">
            <Label htmlFor="address">Listing address</Label>
            <div className="w-full">
              <div className="flex-1" id="address">
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
            </div>
          </div>
        </ListingStageScaffold>
      </div>
    </div>
  );
}
