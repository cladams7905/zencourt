import { ViewSidebar } from "./ViewSidebar";
import { getCurrentUserSidebarData } from "@web/src/server/actions/user/queries";
import {
  getPaymentPlanLabel,
  getUserDisplayNames
} from "@web/src/lib/core/formatting/userDisplay";

export async function SidebarWrapper() {
  const sidebarData = await getCurrentUserSidebarData();
  if (!sidebarData) {
    return null;
  }
  const { user, userAdditional, listings } = sidebarData;
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
