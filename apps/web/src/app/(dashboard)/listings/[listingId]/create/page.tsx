import { redirect } from "next/navigation";
import { runWithCaller } from "@web/src/server/infra/logger/callContext";
import { getListingById, updateListing } from "@web/src/server/models/listings";
import { requireUserOrRedirect } from "@web/src/app/(dashboard)/_utils/requireUserOrRedirect";
import { ListingCreateView } from "@web/src/components/listings/create/components";
import {
  parseInitialMediaTab,
  parseInitialSubcategory
} from "@web/src/components/listings/create/domain";
import { redirectToListingStage } from "../_utils/redirectToListingStage";
import { getListingCreateViewDataForCurrentUser } from "@web/src/server/actions/listings/queries";

interface ListingCreatePageProps {
  params: Promise<{ listingId: string }>;
  searchParams?: Promise<{ mediaType?: string; filter?: string }>;
}

export default async function ListingCreatePage({
  params,
  searchParams
}: ListingCreatePageProps) {
  return runWithCaller("listings/[id]/create", async () => {
    const { listingId } = await params;
    const resolvedSearchParams = (await searchParams) ?? {};
    const initialMediaTab = parseInitialMediaTab(
      resolvedSearchParams.mediaType
    );
    const initialSubcategory = parseInitialSubcategory(
      resolvedSearchParams.filter
    );
    const user = await requireUserOrRedirect();

    if (!listingId?.trim()) {
      redirect("/listings/sync");
    }

    const listing = await getListingById(user.id, listingId);
    if (!listing) {
      redirect("/listings/sync");
    }

    redirectToListingStage(listingId, listing.listingStage, "create");

    await updateListing(user.id, listingId, {
      lastOpenedAt: new Date(),
      listingStage: "create"
    });

    const { videoItems, listingPostItems, listingImages } =
      await getListingCreateViewDataForCurrentUser(listingId);
    return (
      <ListingCreateView
        listingId={listingId}
        title={listing.title?.trim() || "Listing"}
        listingAddress={listing.address ?? null}
        videoItems={videoItems}
        listingPostItems={listingPostItems}
        initialMediaTab={initialMediaTab}
        initialSubcategory={initialSubcategory}
        listingImages={listingImages}
      />
    );
  });
}
