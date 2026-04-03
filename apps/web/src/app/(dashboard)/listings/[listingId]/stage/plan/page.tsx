import { redirect } from "next/navigation";
import { runWithCaller } from "@web/src/server/infra/logger/callContext";
import { getListingById } from "@web/src/server/models/listings";
import {
  getListingImages,
  mapListingImageToDisplayItem
} from "@web/src/server/models/listings/images";
import { listingStreetLineFromAddress } from "@shared/utils/address";
import { ListingPlanView } from "@web/src/components/listings/stage/plan";
import { ListingStageViewProvider } from "@web/src/components/listings/stage/shared";
import { enforceListingStageAccess } from "../_utils/redirectToListingStage";
import { requireUserOrRedirect } from "@web/src/app/(dashboard)/_utils/requireUserOrRedirect";

interface ListingStagePlanPageProps {
  params: Promise<{ listingId: string }>;
}

export default async function ListingStagePlanPage({
  params
}: ListingStagePlanPageProps) {
  return runWithCaller("listings/[id]/stage/plan", async () => {
    const { listingId } = await params;
    const user = await requireUserOrRedirect();
    if (!listingId?.trim()) {
      redirect("/listings/create");
    }

    const listing = await getListingById(user.id, listingId);
    if (!listing) {
      redirect("/listings/create");
    }

    enforceListingStageAccess(listingId, listing.listingStage, "plan");

    const images = await getListingImages(user.id, listingId);
    const imageItems = images.map(mapListingImageToDisplayItem);

    return (
      <ListingStageViewProvider
        stage="plan"
        title={
          listingStreetLineFromAddress(listing.address) ||
          listing.title?.trim() ||
          "Listing"
        }
        listingView
        listingId={listingId}
        listingDbStage={listing.listingStage}
      >
        <ListingPlanView
          title={listing.title?.trim() || "Listing"}
          initialAddress={listing.address ?? ""}
          listingId={listingId}
          initialImages={imageItems}
          hasPropertyDetails={Boolean(listing.propertyDetails)}
        />
      </ListingStageViewProvider>
    );
  });
}
