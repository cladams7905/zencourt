"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { AddressAutocomplete } from "@web/src/components/location";
import { Button } from "@web/src/components/ui/button";
import {
  ListingTimeline,
  type ListingStageStep
} from "@web/src/components/listings/shared";
import { ViewHeader } from "@web/src/components/view/ViewHeader";
import {
  createListingForCurrentUser,
  updateListingForCurrentUser
} from "@web/src/server/actions/listings/commands";
import { emitListingSidebarUpdate } from "@web/src/lib/domain/listings/sidebarEvents";
import { Label } from "../../ui/label";

type ListingCreateViewProps = {
  googleMapsApiKey: string;
};

export function ListingCreateView({
  googleMapsApiKey
}: ListingCreateViewProps) {
  const timelineSteps: ListingStageStep[] = [
    { label: "1. Enter address", sublabel: "~30 sec", active: true },
    { label: "2. Upload listing photos", sublabel: "~2 min" },
    { label: "3. Categorize photos", sublabel: "~2 min" },
    { label: "4. Review details", sublabel: "~1 min" },
    { label: "5. Generate content", sublabel: "~4-7 min" }
  ];

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
    <div className="flex h-full min-h-full flex-col">
      <ViewHeader
        title="Create listing"
        subtitle="Start by entering the property address."
        hideCreateButton
      />
      <div className="mx-auto flex min-h-0 w-full flex-1 items-stretch bg-background px-8 py-10">
        <div className="mx-auto flex h-full w-full max-w-6xl rounded-lg border border-border px-6 py-6">
          <section className="flex h-full w-full flex-col text-left md:flex-row md:items-stretch">
            <div className="w-full pb-6 md:flex md:w-[260px] md:shrink-0 md:justify-center md:pr-6 md:pb-0">
              <ListingTimeline steps={timelineSteps} desktopVertical />
            </div>
            <div className="-mx-6 h-px w-[calc(100%+3rem)] bg-border/80 md:-my-6 md:mx-0 md:mr-6 md:h-[calc(100%+3rem)] md:w-px md:self-stretch" />
            <div className="flex w-full flex-1 flex-col">
              <div className="w-full pb-6 md:pb-5 space-y-1">
                <h2 className="text-xl mt-6 md:mt-0 font-medium text-foreground">
                  Step 1: Enter Listing Address
                </h2>
                <p className="text-sm text-muted-foreground">
                  We use this to title the listing and populate listing details.
                </p>
              </div>
              <div className="-mx-6 h-px w-[calc(100%+3rem)] bg-border/80 md:-mx-6 md:w-[calc(100%+3rem)]" />
              <div className="flex w-full flex-1 flex-col">
                <div className="-mx-6 flex h-full w-[calc(100%+3rem)] flex-1 flex-col items-center justify-center bg-secondary px-6">
                  <div className="w-full text-left max-w-lg">
                    <div className="w-full space-y-2 justify-center items-center h-full">
                      <Label htmlFor="address">Listing address</Label>
                      <div className="w-full">
                        <div className="flex-1" id="address">
                          <AddressAutocomplete
                            placeholder="123 Market Street, Seattle WA"
                            value={address}
                            onChange={setAddress}
                            apiKey={googleMapsApiKey}
                            onSelectAddress={(selection) => {
                              const nextAddress =
                                selection.formattedAddress?.trim();
                              if (nextAddress) {
                                setAddress(nextAddress);
                              }
                            }}
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
                <div>
                  <div className="-mx-6 h-px w-[calc(100%+3rem)] bg-border/80" />
                  <div className="flex justify-end pt-4">
                    <Button
                      type="button"
                      onClick={() => {
                        void handleContinue();
                      }}
                      disabled={!address.trim() || isSubmitting}
                    >
                      {isSubmitting ? "Submitting..." : "Continue"}
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
