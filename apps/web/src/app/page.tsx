import { getUserListings } from "../server/actions/db/listings";
import { DashboardView } from "../components/dashboard/DashboardView";
import { DBListing } from "@shared/types/models";
import { getUser } from "../server/actions/db/users";
import { getOrCreateUserAdditional, getUserProfileCompletion } from "../server/actions/db/userAdditional";
import { LandingPage } from "../components/landing/LandingPage";
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getLocationLabel, getPaymentPlanLabel, getUserDisplayNames } from "../lib/userDisplay";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Zencourt - Effortless Social Media Marketing for Real Estate",
  description:
    "Turn every listing into a powerful social media listing in minutes. Generate videos, reels, and posts automatically from your property photos with AI-powered content creation.",
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
  const user = await getUser();

  // If user is authenticated and has completed welcome survey, show dashboard
  if (user) {
    const userAdditional = await getOrCreateUserAdditional(user.id);
    if (!userAdditional.surveyCompletedAt) {
      redirect("/welcome");
    }

    const { headerName, sidebarName } = getUserDisplayNames(user);
    const locationLabel = getLocationLabel(userAdditional.location);
    const paymentPlanLabel = getPaymentPlanLabel(userAdditional.paymentPlan);

    const listings: DBListing[] = await getUserListings(user.id);
    const profileCompletion = await getUserProfileCompletion(user.id);

    return (
      <DashboardView
        initialListings={listings}
        headerName={headerName}
        location={locationLabel}
        sidebarName={sidebarName}
        sidebarPlan={paymentPlanLabel}
        userAvatar={user.profileImageUrl ?? undefined}
        profileCompleted={profileCompletion.profileCompleted}
        writingStyleCompleted={profileCompletion.writingStyleCompleted}
        mediaUploaded={profileCompletion.mediaUploaded}
      />
    );
  }

  // Otherwise show landing page
  return <LandingPage />;
}
