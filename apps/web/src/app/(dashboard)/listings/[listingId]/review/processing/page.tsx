import { redirect } from "next/navigation";
import { getUser } from "@web/src/server/actions/db/users";
import { getListingById } from "@web/src/server/actions/db/listings";
import { ListingProcessingView } from "@web/src/components/listings/ListingProcessingView";

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

  if (listing.listingStage !== "review") {
    switch (listing.listingStage) {
      case "create":
        redirect(`/listings/${listingId}/create`);
      case "generate":
        redirect(`/listings/${listingId}/generate`);
      case "categorize":
      default:
        redirect(`/listings/${listingId}/categorize`);
    }
  }

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
