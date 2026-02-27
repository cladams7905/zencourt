"use server";

import { withServerActionCaller } from "@web/src/server/infra/logger/callContext";
import { requireAuthenticatedUser } from "@web/src/server/actions/_auth/api";
import { getUserListingSummariesPage } from "@web/src/server/models/listings";
import { requireListingAccess } from "@web/src/server/models/listings/access";
import { getListingVideoStatus } from "@web/src/server/services/videoGeneration";
import {
  getListingImages,
  mapListingImageToDisplayItem
} from "@web/src/server/models/listingImages";
import { getAllCachedListingContentForCreate } from "@web/src/server/infra/cache/listingContent/cache";
import type { ContentItem } from "@web/src/components/dashboard/components/ContentGrid";

export const getCurrentUserListingSummariesPage = withServerActionCaller(
  "getCurrentUserListingSummariesPage",
  async (params: { limit: number; offset: number }) => {
    const user = await requireAuthenticatedUser();
    return getUserListingSummariesPage(user.id, params);
  }
);

export const getListingCreateViewDataForCurrentUser = withServerActionCaller(
  "getListingCreateViewDataForCurrentUser",
  async (listingId: string) => {
    const user = await requireAuthenticatedUser();
    await requireListingAccess(listingId, user.id);

    const [status, listingImages, listingPostItems] = await Promise.all([
      getListingVideoStatus(listingId),
      getListingImages(user.id, listingId),
      getAllCachedListingContentForCreate({ userId: user.id, listingId })
    ]);

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

    return {
      videoItems,
      listingPostItems,
      listingImages: listingImages.map(mapListingImageToDisplayItem)
    };
  }
);
