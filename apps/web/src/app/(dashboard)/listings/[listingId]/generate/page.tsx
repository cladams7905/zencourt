import { redirect } from "next/navigation";
import { runWithCaller } from "@web/src/server/infra/logger/callContext";
import { getListingById } from "@web/src/server/models/listings";
import { getLatestVideoGenBatchByListingId } from "@web/src/server/models/video";
import { requireUserOrRedirect } from "@web/src/app/(dashboard)/_utils/requireUserOrRedirect";
import { ListingProcessingView } from "@web/src/components/listings/processing";
import { redirectToListingStage } from "../_utils/redirectToListingStage";

interface ListingGeneratePageProps {
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

export default async function ListingGeneratePage({
  params
}: ListingGeneratePageProps) {
  return runWithCaller("listings/[id]/generate", async () => {
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
      <ListingProcessingView
        mode="generate"
        listingId={listingId}
        initialBatchId={getResumableBatchId(latestBatch)}
        userId={user.id}
        title={listing.title?.trim() || "Listing"}
      />
    );
  });
}
