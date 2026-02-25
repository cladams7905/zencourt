import { runWithCaller } from "@web/src/server/infra/logger/callContext";
import { getUserListingSummariesPage } from "@web/src/server/models/listings";
import { MyListingsView } from "@web/src/components/listings/myListings";
import { requireUserOrRedirect } from "@web/src/app/(dashboard)/_utils/requireUserOrRedirect";

export default async function ListingsIndexPage() {
  return runWithCaller("listings", async () => {
    const user = await requireUserOrRedirect();

    const { items, hasMore } = await getUserListingSummariesPage(user.id, {
      limit: 10,
      offset: 0
    });

    return <MyListingsView initialListings={items} initialHasMore={hasMore} />;
  });
}
