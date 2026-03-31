"use client";

import { AddressAutocomplete } from "@web/src/components/location";
import {
  ListingStageFooter,
  ListingStageShell
} from "@web/src/components/listings/stage";
import { useListingAddressFlow } from "./domain";
import { Label } from "../../../ui/label";

type ListingAddressViewProps = {
  googleMapsApiKey: string;
  /** When set, Continue updates this listing instead of creating a new draft. */
  prefilledListingId?: string | null;
  /** Address from that listing (if any) to show in the field. */
  initialAddressFromListing?: string | null;
};

export function ListingAddressView({
  googleMapsApiKey,
  prefilledListingId,
  initialAddressFromListing
}: ListingAddressViewProps) {
  const {
    address,
    handleAddressChange,
    handleAddressSelect,
    canContinue,
    isSubmitting,
    handleContinue,
    showSelectionHint
  } = useListingAddressFlow({
    prefilledListingId,
    initialAddressFromListing
  });

  return (
    <ListingStageShell
      stage="address"
      footer={
        <ListingStageFooter
          onContinue={() => {
            void handleContinue();
          }}
          canContinue={canContinue}
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
              onChange={handleAddressChange}
              apiKey={googleMapsApiKey}
              onSelectAddress={handleAddressSelect}
            />
          </div>
        </div>
        {showSelectionHint ? (
          <p className="text-muted-foreground text-sm">
            Choose an address from the suggestions so we can verify the
            location.
          </p>
        ) : null}
      </div>
    </ListingStageShell>
  );
}
