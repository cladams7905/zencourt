import { redirect } from "next/navigation";
import { getListingById } from "@web/src/server/actions/db/listings";
import { requireUserOrRedirect } from "@web/src/app/(dashboard)/_utils/requireUserOrRedirect";
import { ListingProcessingView } from "@web/src/components/listings/processing";
import { redirectToListingStage } from "../../_utils/redirectToListingStage";

interface ListingPropertyProcessingPageProps {
  params: Promise<{ listingId: string }>;
}

export default async function ListingPropertyProcessingPage({
  params
}: ListingPropertyProcessingPageProps) {
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

  return (
    <ListingProcessingView
      mode="review"
      listingId={listingId}
      userId={user.id}
      title={listing.title?.trim() || "Listing"}
      address={listing.address ?? ""}
    />
  );
}
