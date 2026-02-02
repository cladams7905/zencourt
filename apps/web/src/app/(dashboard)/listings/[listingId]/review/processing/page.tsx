import { redirect } from "next/navigation";
import { getUser } from "@web/src/server/actions/db/users";
import { getListingById } from "@web/src/server/actions/db/listings";
import { ListingPropertyProcessingView } from "@web/src/components/listings/ListingPropertyProcessingView";

interface ListingPropertyProcessingPageProps {
  params: Promise<{ listingId: string }>;
}

export default async function ListingPropertyProcessingPage({
  params
}: ListingPropertyProcessingPageProps) {
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

  return (
    <ListingPropertyProcessingView
      listingId={listingId}
      userId={user.id}
      title={listing.title?.trim() || "Listing"}
      address={listing.address ?? ""}
    />
  );
}
