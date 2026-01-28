import { getUserListings } from "@web/src/server/actions/db/listings";
import { DashboardView } from "@web/src/components/dashboard/DashboardView";
import { DBListing } from "@shared/types/models";
import { getUser } from "@web/src/server/actions/db/users";
import { getOrCreateUserAdditional, getUserProfileCompletion } from "@web/src/server/actions/db/userAdditional";
import { LandingPage } from "@web/src/components/landing/LandingPage";
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { getLocationLabel, getUserDisplayNames } from "@web/src/lib/userDisplay";

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

  // If no user but has session cookies, user is unverified (restricted)
  if (!user) {
    const cookieStore = await cookies();
    const hasSession =
      cookieStore.get("stack-access")?.value ||
      cookieStore.get("stack-refresh")?.value;

    if (hasSession) {
      // User has session but getUser() returned null = unverified (restricted) user
      redirect("/check-inbox");
    }

    // No session - show landing page
    return <LandingPage />;
  }

  // If user's email is not verified, redirect to check-inbox
  if (!user.primaryEmailVerified) {
    redirect("/check-inbox");
  }

  const userAdditional = await getOrCreateUserAdditional(user.id);
  if (!userAdditional.surveyCompletedAt) {
    redirect("/welcome");
  }

  const { headerName } = getUserDisplayNames(user);
  const locationLabel = getLocationLabel(userAdditional.location);

  const listings: DBListing[] = await getUserListings(user.id);
  const profileCompletion = await getUserProfileCompletion(user.id);

  return (
    <DashboardView
      initialListings={listings}
      headerName={headerName}
      location={locationLabel}
      profileCompleted={profileCompletion.profileCompleted}
      writingStyleCompleted={profileCompletion.writingStyleCompleted}
      mediaUploaded={profileCompletion.mediaUploaded}
    />
  );
}
