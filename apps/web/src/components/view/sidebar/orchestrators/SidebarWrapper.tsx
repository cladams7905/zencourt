import { runWithCaller } from "@web/src/server/infra/logger/callContext";
import { getCurrentUserSidebarData } from "@web/src/server/actions/user/queries";
import {
  getPaymentPlanLabel,
  getUserDisplayNames
} from "@web/src/lib/core/formatting/userDisplay";
import { ViewSidebar } from "./ViewSidebar";

export async function SidebarWrapper() {
  return runWithCaller("sidebar", async () => {
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
  });
}
