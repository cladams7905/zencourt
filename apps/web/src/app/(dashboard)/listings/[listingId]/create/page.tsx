import { redirect } from "next/navigation";
import { getUser } from "@web/src/server/actions/db/users";
import {
  getListingImages,
  getListingById,
  updateListing
} from "@web/src/server/actions/db/listings";
import { getContentByListingId } from "@web/src/server/actions/db/content";
import { getListingVideoStatus } from "@web/src/server/services/videoStatusService";
import {
  ListingCreateView,
  type ListingCreateMediaTab
} from "@web/src/components/listings/create/ListingCreateView";
import type { ContentItem } from "@web/src/components/dashboard/ContentGrid";
import {
  LISTING_CONTENT_SUBCATEGORIES,
  type ListingContentSubcategory
} from "@shared/types/models";

interface ListingCreatePageProps {
  params: Promise<{ listingId: string }>;
  searchParams?: Promise<{ mediaType?: string; filter?: string }>;
}

function parseInitialMediaTab(value?: string): ListingCreateMediaTab {
  return value === "photos" ? "images" : "videos";
}

function parseInitialSubcategory(value?: string): ListingContentSubcategory {
  if (
    value &&
    LISTING_CONTENT_SUBCATEGORIES.includes(value as ListingContentSubcategory)
  ) {
    return value as ListingContentSubcategory;
  }
  return LISTING_CONTENT_SUBCATEGORIES[0];
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
  const listingContent = await getContentByListingId(user.id, listingId);
  const listingPostItems: ContentItem[] = listingContent
    .filter((entry) => entry.contentType === "post")
    .sort((a, b) => {
      const sortA =
        typeof (a.metadata as Record<string, unknown> | null)?.sortOrder ===
        "number"
          ? ((a.metadata as Record<string, unknown>).sortOrder as number)
          : 0;
      const sortB =
        typeof (b.metadata as Record<string, unknown> | null)?.sortOrder ===
        "number"
          ? ((b.metadata as Record<string, unknown>).sortOrder as number)
          : 0;
      return sortA - sortB;
    })
    .map((entry) => {
      const metadata = (entry.metadata ?? {}) as Record<string, unknown>;
      return {
        id: entry.id,
        aspectRatio: "square",
        isFavorite: entry.isFavorite ?? false,
        hook: typeof metadata.hook === "string" ? metadata.hook : undefined,
        caption:
          typeof metadata.caption === "string" ? metadata.caption : null,
        body: Array.isArray(metadata.body)
          ? (metadata.body as ContentItem["body"])
          : null,
        brollQuery:
          typeof metadata.broll_query === "string"
            ? metadata.broll_query
            : null,
        listingSubcategory:
          typeof metadata.listingSubcategory === "string"
            ? (metadata.listingSubcategory as ListingContentSubcategory)
            : null,
        mediaType:
          metadata.mediaType === "image" || metadata.mediaType === "video"
            ? metadata.mediaType
            : "video"
      } satisfies ContentItem;
    });
  return (
    <ListingCreateView
      listingId={listingId}
      title={listing.title?.trim() || "Listing"}
      listingAddress={listing.address ?? null}
      videoItems={videoItems}
      listingPostItems={listingPostItems}
      initialMediaTab={initialMediaTab}
      initialSubcategory={initialSubcategory}
      listingImages={listingImages.map((image) => ({
        id: image.id,
        url: image.url,
        category: image.category ?? null,
        isPrimary: Boolean(image.isPrimary),
        primaryScore:
          typeof image.primaryScore === "number" ? image.primaryScore : null,
        uploadedAtMs: image.uploadedAt.getTime()
      }))}
    />
  );
}
