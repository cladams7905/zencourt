import { redirect } from "next/navigation";
import { runWithCaller } from "@web/src/server/infra/logger/callContext";
import { getListingById } from "@web/src/server/models/listings";
import { requireUserOrRedirect } from "@web/src/app/(dashboard)/_utils/requireUserOrRedirect";
import { ListingContentView } from "@web/src/components/listings/content/ListingContentView";
import { resolveListingOpenHouseContext } from "@web/src/lib/domain/listings/content/openHouse";
import {
  parseInitialMediaTab,
  parseInitialSubcategory
} from "@web/src/components/listings/content/domain/query";
import { redirectToListingStage } from "../stage/_utils/redirectToListingStage";
import { getListingContentViewData } from "@web/src/server/actions/listings/viewData";
import type { ListingPropertyDetails } from "@shared/types/models";

interface ListingContentPageProps {
  params: Promise<{ listingId: string }>;
  searchParams?: Promise<{ mediaType?: string; filter?: string }>;
}

export default async function ListingContentPage({
  params,
  searchParams
}: ListingContentPageProps) {
  return runWithCaller("listings/[id]/content", async () => {
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
      redirect("/listings/create");
    }

    const listing = await getListingById(user.id, listingId);
    if (!listing) {
      redirect("/listings/create");
    }

    redirectToListingStage(listingId, listing.listingStage, "complete");

    const {
      listingClipItems,
      clipVersionItems,
      listingContentItems,
      listingImages,
      userMediaVideoCount
    } = await getListingContentViewData(user.id, listingId, {
      initialMediaTab,
      initialSubcategory
    });
    const openHouseContext = resolveListingOpenHouseContext({
      listingPropertyDetails:
        (listing.propertyDetails as ListingPropertyDetails | null) ?? null,
      listingAddress: listing.address ?? null
    });

    return (
      <ListingContentView
        listingId={listingId}
        title={listing.title?.trim() || "Listing"}
        listingAddress={listing.address ?? null}
        openHouseContext={openHouseContext}
        listingClipItems={listingClipItems}
        clipVersionItems={clipVersionItems}
        listingContentItems={listingContentItems}
        initialMediaTab={initialMediaTab}
        initialSubcategory={initialSubcategory}
        listingImages={listingImages}
        userMediaVideoCount={userMediaVideoCount}
      />
    );
  });
}
