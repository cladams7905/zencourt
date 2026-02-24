import { redirect } from "next/navigation";
import {
  getListingById,
  updateListing
} from "@web/src/server/models/listings";
import {
  getListingImages,
  mapListingImageToDisplayItem
} from "@web/src/server/models/listingImages";
import { ListingCategorizeView } from "@web/src/components/listings/categorize";
import { redirectToListingStage } from "../_utils/redirectToListingStage";
import { requireUserOrRedirect } from "@web/src/app/(dashboard)/_utils/requireUserOrRedirect";

interface ListingCategorizePageProps {
  params: Promise<{ listingId: string }>;
}

export default async function ListingCategorizePage({
  params
}: ListingCategorizePageProps) {
  const { listingId } = await params;
  const user = await requireUserOrRedirect();
  const googleMapsApiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY ?? "";

  if (!listingId?.trim()) {
    redirect("/listings/sync");
  }

  const listing = await getListingById(user.id, listingId);
  if (!listing) {
    redirect("/listings/sync");
  }

  redirectToListingStage(listingId, listing.listingStage, "categorize");

  await updateListing(user.id, listingId, { lastOpenedAt: new Date() });

  const images = await getListingImages(user.id, listingId);
  const imageItems = images.map(mapListingImageToDisplayItem);

  return (
    <ListingCategorizeView
      title={listing.title?.trim() || "Listing"}
      initialAddress={listing.address ?? ""}
      listingId={listingId}
      userId={user.id}
      initialImages={imageItems}
      googleMapsApiKey={googleMapsApiKey}
      hasPropertyDetails={Boolean(listing.propertyDetails)}
    />
  );
}
