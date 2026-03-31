import { redirect } from "next/navigation";
import { runWithCaller } from "@web/src/server/infra/logger/callContext";
import { getListingById } from "@web/src/server/models/listings";
import { requireUserOrRedirect } from "@web/src/app/(dashboard)/_utils/requireUserOrRedirect";
import { ListingProcessingView } from "@web/src/components/listings/stage/processing";
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
      <ListingProcessingView
        mode="review"
        listingId={listingId}
        userId={user.id}
        title={listing.title?.trim() || "Listing"}
        address={listing.address ?? ""}
      />
    );
  });
}
