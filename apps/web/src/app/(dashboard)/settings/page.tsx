import { redirect } from "next/navigation";
import { SettingsView } from "@web/src/components/settings/SettingsView";
import { getUser } from "@web/src/server/actions/db/users";
import {
  getOrCreateUserAdditional,
  markProfileCompleted
} from "@web/src/server/actions/db/userAdditional";
import {
  getDefaultAgentName,
  getDefaultHeadshotUrl,
  getPaymentPlanLabel,
  getUserDisplayNames,
  getUserEmailInfo
} from "@web/src/lib/userDisplay";

export default async function SettingsPage() {
  const user = await getUser();

  if (!user) {
    redirect("/handler/sign-in");
  }

  const userAdditional = await getOrCreateUserAdditional(user.id);
  if (!userAdditional.profileCompletedAt && userAdditional.agentName.trim()) {
    await markProfileCompleted(user.id);
  }

  const { email } = getUserEmailInfo(user);
  const defaultAgentName = getDefaultAgentName(user);

  const { sidebarName: userName } = getUserDisplayNames(user);

  const defaultHeadshotUrl = getDefaultHeadshotUrl(user);

  const paymentPlanLabel = getPaymentPlanLabel(userAdditional.paymentPlan);
  const googleMapsApiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY ?? "";

  return (
    <SettingsView
      userId={user.id}
      userAdditional={userAdditional}
      userEmail={email}
      userName={userName}
      defaultAgentName={defaultAgentName}
      defaultHeadshotUrl={defaultHeadshotUrl}
      paymentPlan={paymentPlanLabel}
      location={userAdditional.location ?? undefined}
      googleMapsApiKey={googleMapsApiKey}
    />
  );
}
