import { redirect } from "next/navigation";
import { runWithCaller } from "@web/src/server/infra/logger/callContext";
import { getListingById } from "@web/src/server/models/listings";
import { requireUserOrRedirect } from "@web/src/app/(dashboard)/_utils/requireUserOrRedirect";
import { listingStreetLineFromAddress } from "@shared/utils/address";
import { ListingProcessingView } from "@web/src/components/listings/stage/processing";
import { ListingStageViewProvider } from "@web/src/components/listings/stage/shared";
import { redirectToListingStage } from "../../_utils/redirectToListingStage";

interface ListingStageCategorizeProcessingPageProps {
  params: Promise<{ listingId: string }>;
  searchParams?: Promise<{ batch?: string; batchStartedAt?: string }>;
}

export default async function ListingStageCategorizeProcessingPage({
  params,
  searchParams
}: ListingStageCategorizeProcessingPageProps) {
  return runWithCaller(
    "listings/[id]/stage/categorize/processing",
    async () => {
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
        redirect("/listings/create");
      }

      const listing = await getListingById(user.id, listingId);
      if (!listing) {
        redirect("/listings/create");
      }

      redirectToListingStage(listingId, listing.listingStage, "categorize");

      return (
        <ListingStageViewProvider
          stage="categorize"
          title={
            listingStreetLineFromAddress(listing.address) ||
            listing.title?.trim() ||
            "Listing"
          }
          listingView
          listingId={listingId}
          listingDbStage={listing.listingStage}
        >
          <ListingProcessingView
            mode="categorize"
            listingId={listingId}
            userId={user.id}
            batchCount={Number.isNaN(batchCount) ? null : batchCount}
            batchStartedAt={Number.isNaN(batchStartedAt) ? null : batchStartedAt}
          />
        </ListingStageViewProvider>
      );
    }
  );
}
