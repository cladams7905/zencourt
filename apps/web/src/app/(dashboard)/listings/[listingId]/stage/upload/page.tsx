import { redirect } from "next/navigation";
import { runWithCaller } from "@web/src/server/infra/logger/callContext";
import { getListingById } from "@web/src/server/models/listings";
import { requireUserOrRedirect } from "@web/src/app/(dashboard)/_utils/requireUserOrRedirect";
import { redirectToListingStage } from "@web/src/app/(dashboard)/listings/[listingId]/stage/_utils/redirectToListingStage";
import { listingStreetLineFromAddress } from "@shared/utils/address";
import { ListingUploadView } from "@web/src/components/listings/stage/upload";
import { ListingStageViewProvider } from "@web/src/components/listings/stage/shared";

interface ListingStageUploadPageProps {
  params: Promise<{ listingId: string }>;
}

export default async function ListingStageUploadPage({
  params
}: ListingStageUploadPageProps) {
  return runWithCaller("listings/[id]/stage/upload", async () => {
    const { listingId } = await params;
    const user = await requireUserOrRedirect();

    if (!listingId?.trim()) {
      redirect("/listings/create");
    }

    const listing = await getListingById(user.id, listingId);
    if (!listing) {
      redirect("/listings/create");
    }

    redirectToListingStage(listingId, listing.listingStage, "upload");

    return (
      <ListingStageViewProvider
        stage="upload"
        title={
          listingStreetLineFromAddress(listing.address) ||
          listing.title?.trim() ||
          "Listing"
        }
        listingView
        listingId={listingId}
        listingDbStage={listing.listingStage}
      >
        <ListingUploadView listingId={listingId} />
      </ListingStageViewProvider>
    );
  });
}
