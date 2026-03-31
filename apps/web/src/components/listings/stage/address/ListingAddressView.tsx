"use client";

import { AddressAutocomplete } from "@web/src/components/location";
import {
  ListingStageFooter,
  ListingStageScaffold,
  buildListingStageFlowSteps
} from "@web/src/components/listings/stage";
import { useListingAddressFlow } from "./domain";
import { ViewHeader } from "@web/src/components/view/ViewHeader";
import { Label } from "../../../ui/label";

type ListingAddressViewProps = {
  googleMapsApiKey: string;
};

export function ListingAddressView({
  googleMapsApiKey
}: ListingAddressViewProps) {
  const timelineSteps = buildListingStageFlowSteps("address");

  const {
    address,
    handleAddressChange,
    handleAddressSelect,
    canContinue,
    isSubmitting,
    handleContinue,
    showSelectionHint
  } = useListingAddressFlow();

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
        </ListingStageScaffold>
      </div>
    </div>
  );
}
