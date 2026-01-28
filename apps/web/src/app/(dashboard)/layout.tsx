import { DashboardShell } from "@web/src/components/dashboard/DashboardShell";
import { getUser } from "@web/src/server/actions/db/users";
import { getOrCreateUserAdditional } from "@web/src/server/actions/db/userAdditional";
import { getPaymentPlanLabel, getUserDisplayNames } from "@web/src/lib/userDisplay";
import { getUserListings } from "@web/src/server/actions/db/listings";

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
  const listings = (await getUserListings(user.id)).map((listing) => ({
    id: listing.id,
    title: listing.title ?? null,
    listingStage: listing.listingStage ?? null
  }));
  const { sidebarName } = getUserDisplayNames(user);
  const paymentPlanLabel = getPaymentPlanLabel(userAdditional.paymentPlan);

  return (
    <DashboardShell
      userName={sidebarName}
      paymentPlan={paymentPlanLabel}
      userAvatar={user.profileImageUrl ?? undefined}
      listings={listings}
    >
      {children}
    </DashboardShell>
  );
}
