import { runWithCaller } from "@web/src/server/infra/logger/callContext";
import { requireUserOrRedirect } from "@web/src/app/(dashboard)/_utils/requireUserOrRedirect";
import { ListingAddressView } from "@web/src/components/listings/stage/address/ListingAddressView";
import { ListingStageViewProvider } from "@web/src/components/listings/stage/shared";

export default async function ListingsCreatePage() {
  return runWithCaller("listings/create", async () => {
    await requireUserOrRedirect();

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
        />
      </ListingStageViewProvider>
    );
  });
}
