import { redirect } from "next/navigation";
import { runWithCaller } from "@web/src/server/infra/logger/callContext";
import { getListingById } from "@web/src/server/models/listings";
import {
  getListingImages,
  mapListingImageToDisplayItem
} from "@web/src/server/models/listings/images";
import { requireUserOrRedirect } from "@web/src/app/(dashboard)/_utils/requireUserOrRedirect";
import { enforceListingStageAccess } from "@web/src/app/(dashboard)/listings/[listingId]/stage/_utils/redirectToListingStage";
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

    enforceListingStageAccess(listingId, listing.listingStage, "upload");
    const images = await getListingImages(user.id, listingId);
    const imageItems = images.map(mapListingImageToDisplayItem);

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
        <ListingUploadView
          listingId={listingId}
          initialImages={imageItems.map((image) => ({
            id: image.id,
            url: image.url,
            filename: image.filename
          }))}
        />
      </ListingStageViewProvider>
    );
  });
}
