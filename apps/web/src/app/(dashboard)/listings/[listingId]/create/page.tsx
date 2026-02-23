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
import { getAllCachedListingContentForFilter } from "@web/src/app/api/v1/listings/[listingId]/content/generate/services/cache";
import type { ListingMediaType } from "@web/src/app/api/v1/listings/[listingId]/content/generate/services/types";
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
import type { ListingContentSubcategory } from "@shared/types/models";

/** Create-flow content item: ContentItem plus optional cached template preview and cache key for template render. */
type ListingCreateContentItem = ContentItem & {
  cachedRenderedPreview?: {
    imageUrl: string;
    templateId: string;
    modifications: Record<string, string>;
  };
  cacheKeyTimestamp?: number;
  cacheKeyId?: number;
};

async function getCachedListingContentForCreate(params: {
  userId: string;
  listingId: string;
  subcategory: ListingContentSubcategory;
  mediaType: ListingMediaType;
}): Promise<ListingCreateContentItem[]> {
  const items = await getAllCachedListingContentForFilter(params);
  if (items.length === 0) return [];

  const { subcategory, mediaType } = params;
  return items.map((item) => {
    const id = `cached-${subcategory}-${mediaType}-${item.cacheKeyTimestamp}-${item.cacheKeyId}`;
    const base: ListingCreateContentItem = {
      id,
      aspectRatio: "square" as const,
      isFavorite: false,
      hook: item.hook,
      caption: item.caption ?? null,
      body: item.body ?? null,
      brollQuery: item.broll_query ?? null,
      listingSubcategory: subcategory,
      mediaType,
      cacheKeyTimestamp: item.cacheKeyTimestamp,
      cacheKeyId: item.cacheKeyId
    };
    if (
      item.renderedImageUrl &&
      item.renderedTemplateId &&
      item.renderedModifications
    ) {
      base.cachedRenderedPreview = {
        imageUrl: item.renderedImageUrl,
        templateId: item.renderedTemplateId,
        modifications: item.renderedModifications
      };
    }
    return base;
  });
}

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
      generationModel: job.generationModel ?? undefined,
      orientation: job.orientation ?? undefined,
      isPriorityCategory: job.isPriorityCategory ?? false,
      aspectRatio: "vertical",
      alt: job.roomName ? `${job.roomName} clip` : "Generated clip"
    }));
  const listingImages = await getListingImages(user.id, listingId);
  const [imageContent, videoContent] = await Promise.all([
    getCachedListingContentForCreate({
      userId: user.id,
      listingId,
      subcategory: initialSubcategory,
      mediaType: "image"
    }),
    getCachedListingContentForCreate({
      userId: user.id,
      listingId,
      subcategory: initialSubcategory,
      mediaType: "video"
    })
  ]);
  const listingPostItems: ContentItem[] = [...imageContent, ...videoContent];
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
