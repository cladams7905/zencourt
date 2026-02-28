import { redirect } from "next/navigation";
import { runWithCaller } from "@web/src/server/infra/logger/callContext";
import { getListingById } from "@web/src/server/models/listings";
import { requireUserOrRedirect } from "@web/src/app/(dashboard)/_utils/requireUserOrRedirect";
import { ListingCreateView } from "@web/src/components/listings/create/components";
import { resolveListingOpenHouseContext } from "@web/src/lib/domain/listings/openHouse";
import {
  parseInitialMediaTab,
  parseInitialSubcategory
} from "@web/src/components/listings/create/domain";
import { redirectToListingStage } from "../_utils/redirectToListingStage";
import { getListingCreateViewData } from "@web/src/server/actions/listings/queries";
import type { ListingPropertyDetails } from "@shared/types/models";

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

    const { videoItems, listingPostItems, listingImages } =
      await getListingCreateViewData(user.id, listingId);
    const openHouseContext = resolveListingOpenHouseContext({
      listingPropertyDetails:
        (listing.propertyDetails as ListingPropertyDetails | null) ?? null,
      listingAddress: listing.address ?? null
    });

    return (
      <ListingCreateView
        listingId={listingId}
        title={listing.title?.trim() || "Listing"}
        listingAddress={listing.address ?? null}
        openHouseContext={openHouseContext}
        videoItems={videoItems}
        listingPostItems={listingPostItems}
        initialMediaTab={initialMediaTab}
        initialSubcategory={initialSubcategory}
        listingImages={listingImages}
      />
    );
  });
}
