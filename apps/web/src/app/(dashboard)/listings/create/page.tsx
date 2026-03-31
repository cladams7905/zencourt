import { runWithCaller } from "@web/src/server/infra/logger/callContext";
import { requireUserOrRedirect } from "@web/src/app/(dashboard)/_utils/requireUserOrRedirect";
import { ListingCreateView } from "@web/src/components/listings/create/ListingCreateView";

export default async function ListingsCreatePage() {
  return runWithCaller("listings/create", async () => {
    await requireUserOrRedirect();

    return (
      <ListingCreateView
        googleMapsApiKey={process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY ?? ""}
      />
    );
  });
}
