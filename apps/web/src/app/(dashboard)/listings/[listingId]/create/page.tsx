import { redirect } from "next/navigation";
import { getUser } from "@web/src/server/actions/db/users";
import {
  getListingById,
  updateListing
} from "@web/src/server/actions/db/listings";
import { getListingVideoStatus } from "@web/src/server/services/videoStatusService";
import { ListingCreateView } from "@web/src/components/listings/create/ListingCreateView";
import type { ContentItem } from "@web/src/components/dashboard/ContentGrid";
import { buildPreviewTimelineVariants } from "@web/src/lib/video/previewTimeline";

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
      category: job.category ?? undefined,
      durationSeconds: job.durationSeconds ?? undefined,
      generationModel: job.generationModel ?? undefined,
      orientation: job.orientation ?? undefined,
      isPriorityCategory: job.isPriorityCategory ?? false,
      aspectRatio: "vertical",
      alt: job.roomName ? `${job.roomName} clip` : "Generated clip"
    }));

  const previewTimelinePlans = buildPreviewTimelineVariants(
    status.jobs
      .filter((job) => Boolean(job.videoUrl))
      .map((job) => ({
        id: job.jobId,
        category: job.category ?? null,
        durationSeconds: job.durationSeconds ?? null,
        isPriorityCategory: job.isPriorityCategory ?? false,
        sortOrder: job.sortOrder ?? null
      })),
    listingId
  );

  return (
    <ListingCreateView
      listingId={listingId}
      title={listing.title?.trim() || "Listing"}
      items={items}
      previewTimelinePlans={previewTimelinePlans}
    />
  );
}
