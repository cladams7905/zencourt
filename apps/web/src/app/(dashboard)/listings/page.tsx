import { redirect } from "next/navigation";
import { getUser } from "@web/src/server/actions/db/users";
import { getUserListingSummariesPage } from "@web/src/server/actions/db/listings";
import { MyListingsView } from "@web/src/components/listings/my-listings";

export default async function ListingsIndexPage() {
  const user = await getUser();

  if (!user) {
    redirect("/handler/sign-in");
  }

  const { items, hasMore } = await getUserListingSummariesPage(user.id, {
    limit: 10,
    offset: 0
  });

  return <MyListingsView initialListings={items} initialHasMore={hasMore} />;
}
