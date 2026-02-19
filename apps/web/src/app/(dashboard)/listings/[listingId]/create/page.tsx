import { redirect } from "next/navigation";
import {
  getListingById,
  updateListing
} from "@web/src/server/actions/db/listings";
import { requireUserOrRedirect } from "@web/src/app/(dashboard)/_utils/requireUserOrRedirect";
import {
  getListingImages,
  mapListingImageToDisplayItem
} from "@web/src/server/actions/db/listingImages";
import { getListingVideoStatus } from "@web/src/server/services/videoStatus";
import {
  ListingCreateView
} from "@web/src/components/listings/create/orchestrators";
import type { ContentItem } from "@web/src/components/dashboard/components/ContentGrid";
import {
  parseInitialMediaTab,
  parseInitialSubcategory
} from "@web/src/components/listings/create/domain";
import { redirectToListingStage } from "../_utils/redirectToListingStage";

interface ListingCreatePageProps {
  params: Promise<{ listingId: string }>;
  searchParams?: Promise<{ mediaType?: string; filter?: string }>;
}

export default async function ListingCreatePage({
  params,
  searchParams
}: ListingCreatePageProps) {
  const { listingId } = await params;
  const resolvedSearchParams = (await searchParams) ?? {};
  const initialMediaTab = parseInitialMediaTab(resolvedSearchParams.mediaType);
  const initialSubcategory = parseInitialSubcategory(
    resolvedSearchParams.filter
  );
  const user = await requireUserOrRedirect();

  if (!listingId?.trim()) {
    redirect("/listings/sync");
  }

  const listing = await getListingById(user.id, listingId);
  if (!listing) {
    redirect("/listings/sync");
  }

  redirectToListingStage(listingId, listing.listingStage, "create");

  await updateListing(user.id, listingId, {
    lastOpenedAt: new Date(),
    listingStage: "create"
  });

  const status = await getListingVideoStatus(listingId);
  const videoItems: ContentItem[] = status.jobs
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
  const listingImages = await getListingImages(user.id, listingId);
  const listingPostItems: ContentItem[] = [];
  return (
    <ListingCreateView
      listingId={listingId}
      title={listing.title?.trim() || "Listing"}
      listingAddress={listing.address ?? null}
      videoItems={videoItems}
      listingPostItems={listingPostItems}
      initialMediaTab={initialMediaTab}
      initialSubcategory={initialSubcategory}
      listingImages={listingImages.map(mapListingImageToDisplayItem)}
    />
  );
}
