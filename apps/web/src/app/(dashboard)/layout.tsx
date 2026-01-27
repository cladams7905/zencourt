import { DashboardSidebar } from "@web/src/components/dashboard/DashboardSidebar";
import { getUser } from "@web/src/server/actions/db/users";
import { getOrCreateUserAdditional } from "@web/src/server/actions/db/userAdditional";
import { getPaymentPlanLabel, getUserDisplayNames } from "@web/src/lib/userDisplay";

export default async function DashboardLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  const user = await getUser();

  if (!user) {
    return <>{children}</>;
  }

  const userAdditional = await getOrCreateUserAdditional(user.id);
  const { sidebarName } = getUserDisplayNames(user);
  const paymentPlanLabel = getPaymentPlanLabel(userAdditional.paymentPlan);

  return (
    <div className="flex h-screen overflow-hidden">
      <DashboardSidebar
        userName={sidebarName}
        paymentPlan={paymentPlanLabel}
        userAvatar={user.profileImageUrl ?? undefined}
      />
      <main className="flex-1 overflow-y-auto bg-background">{children}</main>
    </div>
  );
}
