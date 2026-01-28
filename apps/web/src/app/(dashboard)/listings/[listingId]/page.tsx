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
    category: image.category ?? null
  }));

  return (
    <ListingDetailView
      title={listing.title?.trim() || "Listing"}
      listingId={listingId}
      userId={user.id}
      initialImages={imageItems}
    />
  );
}
