import { getUserListingSummariesPage } from "@web/src/server/actions/db/listings";
import { MyListingsView } from "@web/src/components/listings/myListings";
import { requireUserOrRedirect } from "@web/src/app/(dashboard)/_utils/requireUserOrRedirect";

export default async function ListingsIndexPage() {
  const user = await requireUserOrRedirect();

  const { items, hasMore } = await getUserListingSummariesPage(user.id, {
    limit: 10,
    offset: 0
  });

  return <MyListingsView initialListings={items} initialHasMore={hasMore} />;
}
