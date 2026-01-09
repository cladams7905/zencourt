import { getUserCampaigns } from "../server/actions/db/campaigns";
import { DashboardView } from "../components/dashboard/DashboardView";
import { DBCampaign } from "@shared/types/models";
import { getUser } from "../server/actions/db/users";
import { getOrCreateUserAdditional } from "../server/actions/db/userAdditional";
import { LandingPage } from "../components/landing/LandingPage";
import type { Metadata } from "next";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Zencourt - Effortless Social Media Marketing for Real Estate",
  description:
    "Turn every listing into a powerful social media campaign in minutes. Generate videos, reels, and posts automatically from your property photos with AI-powered content creation.",
  keywords: [
    "real estate marketing",
    "social media automation",
    "property videos",
    "real estate AI",
    "listing marketing",
    "Instagram reels",
    "TikTok videos"
  ]
};

export default async function Home() {
  let user = null;

  try {
    user = await getUser();
  } catch (error) {
    // No authenticated user - show landing page
    console.log("No authenticated user, showing landing page");
  }

  // If user is authenticated and has completed welcome survey, show dashboard
  if (user) {
    const userAdditional = await getOrCreateUserAdditional(user.id);
    if (!userAdditional.surveyCompletedAt) {
      redirect("/welcome");
    }

    const email = user.primaryEmail ?? "";
    const emailUsername = email.split("@")[0] ?? "";
    const displayName = user.displayName?.trim() ?? "";
    const nameParts = displayName.split(/\s+/).filter(Boolean);
    const isGoogleUser =
      user.oauthProviders?.some((provider) => provider.id === "google") ?? false;

    const headerName = isGoogleUser
      ? nameParts[0] || displayName || emailUsername || "there"
      : emailUsername || email || displayName || "there";

    const sidebarName = isGoogleUser
      ? nameParts.length >= 2
        ? `${nameParts[0]} ${nameParts[nameParts.length - 1]}`
        : displayName || emailUsername || email || "User"
      : email || emailUsername || displayName || "User";

    const locationLabel = (() => {
      if (!userAdditional.location) {
        return "Location not set";
      }
      const parts = userAdditional.location
        .split(",")
        .map((part) => part.trim())
        .filter(Boolean);
      if (parts.length >= 2) {
        return `${parts[0]}, ${parts[1]}`;
      }
      return userAdditional.location;
    })();

    const paymentPlanLabels: Record<string, string> = {
      free: "Free",
      starter: "Starter",
      growth: "Growth",
      enterprise: "Enterprise"
    };

    const paymentPlanLabel =
      paymentPlanLabels[userAdditional.paymentPlan] ?? "Free";

    const campaigns: DBCampaign[] = await getUserCampaigns(user.id);
    return (
      <DashboardView
        initialCampaigns={campaigns}
        headerName={headerName}
        location={locationLabel}
        sidebarName={sidebarName}
        sidebarPlan={paymentPlanLabel}
        userAvatar={user.profileImageUrl ?? undefined}
      />
    );
  }

  // Otherwise show landing page
  return <LandingPage />;
}
