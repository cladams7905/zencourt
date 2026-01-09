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

    const campaigns: DBCampaign[] = await getUserCampaigns(user.id);
    return <DashboardView initialCampaigns={campaigns} />;
  }

  // Otherwise show landing page
  return <LandingPage />;
}
