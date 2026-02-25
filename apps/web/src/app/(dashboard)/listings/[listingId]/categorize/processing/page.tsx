import { redirect } from "next/navigation";
import { runWithCaller } from "@web/src/server/infra/logger/callContext";
import { getListingById } from "@web/src/server/models/listings";
import { requireUserOrRedirect } from "@web/src/app/(dashboard)/_utils/requireUserOrRedirect";
import { ListingProcessingView } from "@web/src/components/listings/processing";
import { redirectToListingStage } from "../../_utils/redirectToListingStage";

interface ListingProcessingPageProps {
  params: Promise<{ listingId: string }>;
  searchParams?: Promise<{ batch?: string; batchStartedAt?: string }>;
}

export default async function ListingProcessingPage({
  params,
  searchParams
}: ListingProcessingPageProps) {
  return runWithCaller("listings/[id]/categorize/processing", async () => {
    const { listingId } = await params;
    const resolvedSearchParams = (await searchParams) ?? {};
    const batchCount = resolvedSearchParams.batch
      ? Number(resolvedSearchParams.batch)
      : null;
    const batchStartedAt = resolvedSearchParams.batchStartedAt
      ? Number(resolvedSearchParams.batchStartedAt)
      : null;
    const user = await requireUserOrRedirect();

    if (!listingId?.trim()) {
      redirect("/listings/sync");
    }

    const listing = await getListingById(user.id, listingId);
    if (!listing) {
      redirect("/listings/sync");
    }

    redirectToListingStage(listingId, listing.listingStage, "categorize");

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
  });
}
