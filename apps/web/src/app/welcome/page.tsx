import { redirect } from "next/navigation";
import { SurveyClient } from "@web/src/components/welcome/SurveyClient";
import { getUser } from "@web/src/server/actions/db/users";
import { getOrCreateUserAdditional } from "@web/src/server/actions/db/userAdditional";

export const dynamic = "force-dynamic";

export default async function Survey() {
  const user = await getUser().catch(() => {
    redirect("/handler/sign-in?callbackUrl=/welcome");
  });

  if (!user) {
    redirect("/handler/sign-in?callbackUrl=/welcome");
  }

  const userAdditional = await getOrCreateUserAdditional(user.id);

  if (userAdditional.surveyCompletedAt) {
    redirect("/");
  }

  const googleMapsApiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY ?? "";

  return <SurveyClient googleMapsApiKey={googleMapsApiKey} userId={user.id} />;
}
