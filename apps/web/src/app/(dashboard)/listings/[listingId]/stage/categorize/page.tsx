import { redirect } from "next/navigation";
import { runWithCaller } from "@web/src/server/infra/logger/callContext";
import { getListingById } from "@web/src/server/models/listings";
import {
  getListingImages,
  mapListingImageToDisplayItem
} from "@web/src/server/models/listings/images";
import { listingStreetLineFromAddress } from "@shared/utils/address";
import { ListingCategorizeView } from "@web/src/components/listings/stage/categorize";
import { ListingStageViewProvider } from "@web/src/components/listings/stage/shared";
import { enforceListingStageAccess } from "../_utils/redirectToListingStage";
import { requireUserOrRedirect } from "@web/src/app/(dashboard)/_utils/requireUserOrRedirect";

interface ListingStageCategorizePageProps {
  params: Promise<{ listingId: string }>;
}

export default async function ListingStageCategorizePage({
  params
}: ListingStageCategorizePageProps) {
  return runWithCaller("listings/[id]/stage/categorize", async () => {
    const { listingId } = await params;
    const user = await requireUserOrRedirect();
    const googleMapsApiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY ?? "";

    if (!listingId?.trim()) {
      redirect("/listings/create");
    }

    const listing = await getListingById(user.id, listingId);
    if (!listing) {
      redirect("/listings/create");
    }

    enforceListingStageAccess(listingId, listing.listingStage, "categorize");

    const images = await getListingImages(user.id, listingId);
    const imageItems = images.map(mapListingImageToDisplayItem);

    return (
      <ListingStageViewProvider
        stage="categorize"
        title={
          listingStreetLineFromAddress(listing.address) ||
          listing.title?.trim() ||
          "Listing"
        }
        listingView
        listingId={listingId}
        listingDbStage={listing.listingStage}
      >
        <ListingCategorizeView
          title={listing.title?.trim() || "Listing"}
          initialAddress={listing.address ?? ""}
          listingId={listingId}
          initialImages={imageItems}
          googleMapsApiKey={googleMapsApiKey}
          hasPropertyDetails={Boolean(listing.propertyDetails)}
        />
      </ListingStageViewProvider>
    );
  });
}
