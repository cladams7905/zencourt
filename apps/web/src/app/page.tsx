import { getUserCampaigns } from "../server/actions/db/campaigns";
import { DashboardView } from "../components/DashboardView";
import { DBCampaign } from "@shared/types/models";
import { getUser } from "../server/actions/db/users";
import { LandingPage } from "../components/landing/LandingPage";
import type { Metadata } from "next";

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
  let campaigns: DBCampaign[] = [];

  try {
    user = await getUser();
    campaigns = await getUserCampaigns(user.id);
  } catch (error) {
    // No authenticated user - show landing page
    console.log("No authenticated user, showing landing page");
  }

  // If user is authenticated, show dashboard
  if (user) {
    return <DashboardView initialCampaigns={campaigns} />;
  }

  // Otherwise show landing page
  return <LandingPage />;
}
