import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { SurveyClient } from "@web/src/components/welcome/SurveyClient";
import { getUser } from "@web/src/server/actions/db/users";
import { getOrCreateUserAdditional } from "@web/src/server/actions/db/userAdditional";

export const dynamic = "force-dynamic";

export default async function Survey() {
  const user = await getUser().catch(() => null);

  // If no user returned, check if they have session cookies (unverified user)
  if (!user) {
    const cookieStore = await cookies();
    const hasSession =
      cookieStore.get("stack-access")?.value ||
      cookieStore.get("stack-refresh")?.value;

    if (hasSession) {
      // User has session but getUser() returned null = unverified (restricted) user
      redirect("/check-inbox");
    }

    // No session at all - redirect to sign in
    redirect("/handler/sign-in?callbackUrl=/welcome");
  }

  // If user's email is not verified, redirect to check-inbox
  if (!user.primaryEmailVerified) {
    redirect("/check-inbox");
  }

  const userAdditional = await getOrCreateUserAdditional(user.id);

  if (userAdditional.surveyCompletedAt) {
    redirect("/");
  }

  const googleMapsApiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY ?? "";

  return <SurveyClient googleMapsApiKey={googleMapsApiKey} userId={user.id} />;
}
