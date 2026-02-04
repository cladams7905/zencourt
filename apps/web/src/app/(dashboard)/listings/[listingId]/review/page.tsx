import { redirect } from "next/navigation";
import { getUser } from "@web/src/server/actions/db/users";
import { getListingById, updateListing } from "@web/src/server/actions/db/listings";
import { getOrCreateUserAdditional } from "@web/src/server/actions/db/userAdditional";
import { ListingReviewView } from "@web/src/components/listings/ListingReviewView";

interface ListingReviewPageProps {
  params: Promise<{ listingId: string }>;
}

export default async function ListingReviewPage({
  params
}: ListingReviewPageProps) {
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
  const userAdditional = await getOrCreateUserAdditional(user.id);

  await updateListing(user.id, listingId, { lastOpenedAt: new Date() });

  return (
    <ListingReviewView
      listingId={listingId}
      userId={user.id}
      title={listing.title?.trim() || "Listing"}
      address={listing.address ?? null}
      propertyDetails={listing.propertyDetails ?? null}
      targetAudiences={userAdditional.targetAudiences ?? []}
    />
  );
}
