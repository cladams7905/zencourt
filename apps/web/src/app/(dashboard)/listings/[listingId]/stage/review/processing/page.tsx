import { redirect } from "next/navigation";
import { runWithCaller } from "@web/src/server/infra/logger/callContext";
import { getListingById } from "@web/src/server/models/listings";
import { requireUserOrRedirect } from "@web/src/app/(dashboard)/_utils/requireUserOrRedirect";
import { listingStreetLineFromAddress } from "@shared/utils/address";
import { ListingProcessingView } from "@web/src/components/listings/stage/processing";
import { ListingStageViewProvider } from "@web/src/components/listings/stage/shared";
import { redirectToListingStage } from "../../_utils/redirectToListingStage";

interface ListingStageReviewProcessingPageProps {
  params: Promise<{ listingId: string }>;
}

export default async function ListingStageReviewProcessingPage({
  params
}: ListingStageReviewProcessingPageProps) {
  return runWithCaller("listings/[id]/stage/review/processing", async () => {
    const { listingId } = await params;
    const user = await requireUserOrRedirect();

    if (!listingId?.trim()) {
      redirect("/listings/create");
    }

    const listing = await getListingById(user.id, listingId);
    if (!listing) {
      redirect("/listings/create");
    }

    if (listing.propertyDetails) {
      redirect(`/listings/${listingId}/stage/review`);
    }

    redirectToListingStage(listingId, listing.listingStage, "review");

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
        <ListingProcessingView
          mode="review"
          listingId={listingId}
          userId={user.id}
          address={listing.address ?? ""}
        />
      </ListingStageViewProvider>
    );
  });
}
