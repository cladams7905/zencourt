import { redirect } from "next/navigation";
import { getUser } from "@web/src/server/actions/db/users";
import {
  getListingById,
  getListingImages,
  updateListing
} from "@web/src/server/actions/db/listings";
import { ListingCategorizeView } from "@web/src/components/listings/categorize";

interface ListingCategorizePageProps {
  params: Promise<{ listingId: string }>;
}

export default async function ListingCategorizePage({
  params
}: ListingCategorizePageProps) {
  const { listingId } = await params;
  const user = await getUser();
  const googleMapsApiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY ?? "";

  if (!user) {
    redirect("/handler/sign-in");
  }

  if (!listingId?.trim()) {
    redirect("/listings/sync");
  }

  const listing = await getListingById(user.id, listingId);
  if (!listing) {
    redirect("/listings/sync");
  }

  if (listing.listingStage !== "categorize") {
    switch (listing.listingStage) {
      case "create":
        redirect(`/listings/${listingId}/create`);
      case "generate":
        redirect(`/listings/${listingId}/generate`);
      case "review":
        redirect(`/listings/${listingId}/review`);
      default:
        redirect(`/listings/${listingId}/categorize`);
    }
  }

  await updateListing(user.id, listingId, { lastOpenedAt: new Date() });

  const images = await getListingImages(user.id, listingId);
  const imageItems = images.map((image) => ({
    id: image.id,
    url: image.url,
    filename: image.filename,
    category: image.category ?? null,
    isPrimary: image.isPrimary ?? false,
    primaryScore: image.primaryScore ?? null
  }));

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
