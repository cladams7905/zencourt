import { redirect } from "next/navigation";
import { getUser } from "@web/src/server/actions/db/users";
import { getListingById, updateListing } from "@web/src/server/actions/db/listings";
import { ListingGenerateView } from "@web/src/components/listings/ListingGenerateView";

interface ListingGeneratePageProps {
  params: Promise<{ listingId: string }>;
}

export default async function ListingGeneratePage({
  params
}: ListingGeneratePageProps) {
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

  await updateListing(user.id, listingId, { lastOpenedAt: new Date() });

  return (
    <ListingGenerateView
      listingId={listingId}
      title={listing.title?.trim() || "Listing"}
    />
  );
}
