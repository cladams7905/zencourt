import { redirect } from "next/navigation";
import { MediaView } from "../../components/media/MediaView";
import { getUser } from "@web/src/server/actions/db/users";
import { getOrCreateUserAdditional } from "@web/src/server/actions/db/userAdditional";

export default async function MediaPage() {
  const user = await getUser();

  if (!user) {
    redirect("/handler/sign-in");
  }

  const userAdditional = await getOrCreateUserAdditional(user.id);
  const email = user.primaryEmail ?? "";
  const emailUsername = email.split("@")[0] ?? "";
  const displayName = user.displayName?.trim() ?? "";
  const nameParts = displayName.split(/\s+/).filter(Boolean);
  const isGoogleUser =
    user.oauthProviders?.some((provider) => provider.id === "google") ?? false;

  const userName = isGoogleUser
    ? nameParts.length >= 2
      ? `${nameParts[0]} ${nameParts[nameParts.length - 1]}`
      : displayName || emailUsername || email || "User"
    : email || emailUsername || displayName || "User";

  const paymentPlanLabels: Record<string, string> = {
    free: "Free",
    starter: "Starter",
    growth: "Growth",
    enterprise: "Enterprise"
  };

  const paymentPlanLabel =
    paymentPlanLabels[userAdditional.paymentPlan] ?? "Free";

  return (
    <MediaView
      userName={userName}
      paymentPlan={paymentPlanLabel}
      userAvatar={user.profileImageUrl ?? undefined}
    />
  );
}
