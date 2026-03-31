import { redirect } from "next/navigation";
import { runWithCaller } from "@web/src/server/infra/logger/callContext";
import { getListingById } from "@web/src/server/models/listings";
import { requireUserOrRedirect } from "@web/src/app/(dashboard)/_utils/requireUserOrRedirect";
import { getOrCreateUserAdditional } from "@web/src/server/models/user";
import { listingStreetLineFromAddress } from "@shared/utils/address";
import { ListingReviewView } from "@web/src/components/listings/stage/review";
import { ListingStageViewProvider } from "@web/src/components/listings/stage/shared";
import { redirectToListingStage } from "../_utils/redirectToListingStage";

interface ListingStageReviewPageProps {
  params: Promise<{ listingId: string }>;
}

export default async function ListingStageReviewPage({
  params
}: ListingStageReviewPageProps) {
  return runWithCaller("listings/[id]/stage/review", async () => {
    const { listingId } = await params;
    const user = await requireUserOrRedirect();

    if (!listingId?.trim()) {
      redirect("/listings/create");
    }

    const listing = await getListingById(user.id, listingId);
    if (!listing) {
      redirect("/listings/create");
    }

    redirectToListingStage(listingId, listing.listingStage, "review");

    const userAdditional = await getOrCreateUserAdditional(user.id);

    return (
      <ListingStageViewProvider
        stage="review"
        title={
          listingStreetLineFromAddress(listing.address) ||
          listing.title?.trim() ||
          "Listing"
        }
        listingView
        listingId={listingId}
        listingDbStage={listing.listingStage}
      >
        <ListingReviewView
          listingId={listingId}
          address={listing.address ?? null}
          propertyDetails={listing.propertyDetails ?? null}
          targetAudiences={userAdditional.targetAudiences ?? []}
        />
      </ListingStageViewProvider>
    );
  });
}
