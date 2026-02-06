import { redirect } from "next/navigation";
import { getUser } from "@web/src/server/actions/db/users";
import {
  getListingById,
  updateListing
} from "@web/src/server/actions/db/listings";
import { getListingVideoStatus } from "@web/src/server/services/videoStatusService";
import { ListingCreateView } from "@web/src/components/listings/create/ListingCreateView";
import type { ContentItem } from "@web/src/components/dashboard/ContentGrid";

interface ListingCreatePageProps {
  params: Promise<{ listingId: string }>;
}

export default async function ListingCreatePage({
  params
}: ListingCreatePageProps) {
  const { listingId } = await params;
  const user = await getUser();

  if (!user) {
    redirect("/handler/sign-in");
  }

  if (!listingId?.trim()) {
    redirect("/listings/sync");
  }

  const listing = await getListingById(user.id, listingId);
  if (!listing) {
    redirect("/listings/sync");
  }

  if (listing.listingStage !== "create") {
    switch (listing.listingStage) {
      case "generate":
        redirect(`/listings/${listingId}/generate`);
      case "review":
        redirect(`/listings/${listingId}/review`);
      case "categorize":
      default:
        redirect(`/listings/${listingId}/categorize`);
    }
  }

  await updateListing(user.id, listingId, {
    lastOpenedAt: new Date(),
    listingStage: "create"
  });

  const status = await getListingVideoStatus(listingId);
  const items: ContentItem[] = status.jobs
    .filter((job) => job.videoUrl || job.thumbnailUrl)
    .sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0))
    .map((job) => ({
      id: job.jobId,
      thumbnail: job.thumbnailUrl ?? undefined,
      videoUrl: job.videoUrl ?? undefined,
      aspectRatio: "vertical",
      alt: job.roomName ? `${job.roomName} clip` : "Generated clip"
    }));

  return (
    <ListingCreateView
      listingId={listingId}
      title={listing.title?.trim() || "Listing"}
      items={items}
    />
  );
}
