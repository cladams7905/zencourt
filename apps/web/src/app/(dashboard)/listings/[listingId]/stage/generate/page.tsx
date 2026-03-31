import { redirect } from "next/navigation";
import { runWithCaller } from "@web/src/server/infra/logger/callContext";
import { getListingById } from "@web/src/server/models/listings";
import { getLatestVideoGenBatchByListingId } from "@web/src/server/models/video";
import { requireUserOrRedirect } from "@web/src/app/(dashboard)/_utils/requireUserOrRedirect";
import { listingStreetLineFromAddress } from "@shared/utils/address";
import { ListingProcessingView } from "@web/src/components/listings/stage/processing";
import { ListingStageViewProvider } from "@web/src/components/listings/stage/shared";
import { redirectToListingStage } from "../_utils/redirectToListingStage";

interface ListingStageGeneratePageProps {
  params: Promise<{ listingId: string }>;
}

function getResumableBatchId(
  latestBatch: { id: string; status: string } | null
): string | null {
  if (!latestBatch) {
    return null;
  }

  return latestBatch.status === "pending" || latestBatch.status === "processing"
    ? latestBatch.id
    : null;
}

export default async function ListingStageGeneratePage({
  params
}: ListingStageGeneratePageProps) {
  return runWithCaller("listings/[id]/stage/generate", async () => {
    const { listingId } = await params;
    const user = await requireUserOrRedirect();

    if (!listingId?.trim()) {
      redirect("/listings/create");
    }

    const listing = await getListingById(user.id, listingId);
    const latestBatch = await getLatestVideoGenBatchByListingId(listingId);
    if (!listing) {
      redirect("/listings/create");
    }

    redirectToListingStage(
      listingId,
      listing.listingStage,
      "generate",
      "/listings/create"
    );

    return (
      <ListingStageViewProvider
        stage="generate"
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
          mode="generate"
          listingId={listingId}
          initialBatchId={getResumableBatchId(latestBatch)}
          userId={user.id}
        />
      </ListingStageViewProvider>
    );
  });
}
