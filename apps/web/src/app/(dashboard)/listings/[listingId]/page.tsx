import { redirect } from "next/navigation";
import { getUser } from "@web/src/server/actions/db/users";
import {
  getListingById,
  getListingImages
} from "@web/src/server/actions/db/listings";
import { ListingDetailView } from "@web/src/components/listings/ListingDetailView";

interface ListingDetailPageProps {
  params: Promise<{ listingId: string }>;
}

export default async function ListingDetailPage({
  params
}: ListingDetailPageProps) {
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
    <ListingDetailView
      title={listing.title?.trim() || "Listing"}
      initialAddress={listing.address ?? ""}
      listingId={listingId}
      userId={user.id}
      initialImages={imageItems}
      googleMapsApiKey={googleMapsApiKey}
    />
  );
}
