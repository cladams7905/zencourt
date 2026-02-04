import { ViewSidebar } from "./ViewSidebar";
import { getUser } from "@web/src/server/actions/db/users";
import { getOrCreateUserAdditional } from "@web/src/server/actions/db/userAdditional";
import { getUserListings } from "@web/src/server/actions/db/listings";
import {
  getPaymentPlanLabel,
  getUserDisplayNames
} from "@web/src/lib/userDisplay";

export async function SidebarWrapper() {
  const user = await getUser();

  if (!user) {
    return null;
  }

  const userAdditional = await getOrCreateUserAdditional(user.id);
  const listings = (await getUserListings(user.id)).map((listing) => ({
    id: listing.id,
    title: listing.title ?? null,
    listingStage: listing.listingStage ?? null,
    lastOpenedAt: listing.lastOpenedAt ?? null
  }));
  const { sidebarName } = getUserDisplayNames(user);
  const paymentPlanLabel = getPaymentPlanLabel(userAdditional.paymentPlan);

  return (
    <ViewSidebar
      userName={sidebarName}
      paymentPlan={paymentPlanLabel}
      userAvatar={user.profileImageUrl ?? undefined}
      listings={listings}
    />
  );
}
