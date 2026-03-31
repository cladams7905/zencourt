import { runWithCaller } from "@web/src/server/infra/logger/callContext";
import { requireUserOrRedirect } from "@web/src/app/(dashboard)/_utils/requireUserOrRedirect";
import { ListingAddressView } from "@web/src/components/listings/stage/address/ListingAddressView";
import { ListingStageViewProvider } from "@web/src/components/listings/stage/shared";
import { getListingById } from "@web/src/server/models/listings";

type ListingsCreatePageProps = {
  searchParams: Promise<{ listingId?: string }>;
};

export default async function ListingsCreatePage({
  searchParams
}: ListingsCreatePageProps) {
  return runWithCaller("listings/create", async () => {
    const user = await requireUserOrRedirect();
    const params = await searchParams;
    const listingIdRaw = params.listingId?.trim();

    let prefilledListingId: string | null = null;
    let initialAddressFromListing: string | null = null;

    if (listingIdRaw) {
      const listing = await getListingById(user.id, listingIdRaw);
      if (listing) {
        prefilledListingId = listing.id;
        initialAddressFromListing = listing.address?.trim() ?? null;
      }
    }

    return (
      <ListingStageViewProvider
        stage="address"
        title="Create listing"
        subtitle="Start by entering the property address."
        listingView={false}
        hideCreateButton
      >
        <ListingAddressView
          googleMapsApiKey={process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY ?? ""}
          prefilledListingId={prefilledListingId}
          initialAddressFromListing={initialAddressFromListing}
        />
      </ListingStageViewProvider>
    );
  });
}
