import { redirect } from "next/navigation";
import { getUser } from "@web/src/server/actions/db/users";
import {
  getListingById,
  updateListing
} from "@web/src/server/actions/db/listings";
import { ListingProcessingView } from "@web/src/components/listings/ListingProcessingView";

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
    <ListingProcessingView
      mode="generate"
      listingId={listingId}
      userId={user.id}
      title={listing.title?.trim() || "Listing"}
    />
  );
}
