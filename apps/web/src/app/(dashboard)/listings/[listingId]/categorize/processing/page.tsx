import { redirect } from "next/navigation";
import { getUser } from "@web/src/server/actions/db/users";
import { getListingById } from "@web/src/server/actions/db/listings";
import { ListingProcessingView } from "@web/src/components/listings/ListingProcessingView";

interface ListingProcessingPageProps {
  params: Promise<{ listingId: string }>;
  searchParams?: Promise<{ batch?: string; batchStartedAt?: string }>;
}

export default async function ListingProcessingPage({
  params,
  searchParams
}: ListingProcessingPageProps) {
  const { listingId } = await params;
  const resolvedSearchParams = (await searchParams) ?? {};
  const batchCount = resolvedSearchParams.batch
    ? Number(resolvedSearchParams.batch)
    : null;
  const batchStartedAt = resolvedSearchParams.batchStartedAt
    ? Number(resolvedSearchParams.batchStartedAt)
    : null;
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

  return (
    <ListingProcessingView
      mode="categorize"
      listingId={listingId}
      userId={user.id}
      title={listing.title?.trim() || "Listing"}
      batchCount={Number.isNaN(batchCount) ? null : batchCount}
      batchStartedAt={Number.isNaN(batchStartedAt) ? null : batchStartedAt}
    />
  );
}
