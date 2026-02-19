import { SettingsView } from "@web/src/components/settings";
import { MarkProfileCompleted } from "@web/src/components/settings/MarkProfileCompleted";
import { requireUserOrRedirect } from "@web/src/app/(dashboard)/_utils/requireUserOrRedirect";
import { getOrCreateUserAdditional } from "@web/src/server/actions/db/userAdditional";
import {
  getDefaultAgentName,
  getDefaultHeadshotUrl,
  getPaymentPlanLabel,
  getUserDisplayNames,
  getUserEmailInfo
} from "@web/src/lib/core/formatting/userDisplay";

export default async function SettingsPage() {
  const user = await requireUserOrRedirect();

  const userAdditional = await getOrCreateUserAdditional(user.id);
  const needsProfileCompletion =
    !userAdditional.profileCompletedAt && Boolean(userAdditional.agentName.trim());

  const { email } = getUserEmailInfo(user);
  const defaultAgentName = getDefaultAgentName(user);

  const { sidebarName: userName } = getUserDisplayNames(user);

  const defaultHeadshotUrl = getDefaultHeadshotUrl(user);

  const paymentPlanLabel = getPaymentPlanLabel(userAdditional.paymentPlan);
  const googleMapsApiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY ?? "";

  return (
    <>
      {needsProfileCompletion && <MarkProfileCompleted userId={user.id} />}
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
    </>
  );
}
