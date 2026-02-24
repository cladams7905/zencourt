import { redirect } from "next/navigation";
import {
  getListingById,
  updateListing
} from "@web/src/server/models/listings";
import { requireUserOrRedirect } from "@web/src/app/(dashboard)/_utils/requireUserOrRedirect";
import { getOrCreateUserAdditional } from "@web/src/server/models/userAdditional";
import { ListingReviewView } from "@web/src/components/listings/review";
import { redirectToListingStage } from "../_utils/redirectToListingStage";

interface ListingReviewPageProps {
  params: Promise<{ listingId: string }>;
}

export default async function ListingReviewPage({
  params
}: ListingReviewPageProps) {
  const { listingId } = await params;
  const user = await requireUserOrRedirect();

  if (!listingId?.trim()) {
    redirect("/listings/sync");
  }

  const listing = await getListingById(user.id, listingId);
  if (!listing) {
    redirect("/listings/sync");
  }

  redirectToListingStage(listingId, listing.listingStage, "review");

  const userAdditional = await getOrCreateUserAdditional(user.id);

  await updateListing(user.id, listingId, { lastOpenedAt: new Date() });

  return (
    <ListingReviewView
      listingId={listingId}
      title={listing.title?.trim() || "Listing"}
      address={listing.address ?? null}
      propertyDetails={listing.propertyDetails ?? null}
      targetAudiences={userAdditional.targetAudiences ?? []}
    />
  );
}
