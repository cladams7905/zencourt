"use server";

import { nanoid } from "nanoid";
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
import {
  createClipVersion,
  getCurrentClipVersionsByListingId,
  getSuccessfulClipVersionsByClipId
} from "@web/src/server/models/videoGen";
import type { DBClipVersion } from "@db/types/models";

function buildStableClipId(args: {
  listingId: string;
  roomId?: string | null;
  roomName?: string | null;
  clipIndex?: number | null;
}): string {
  const roomKey =
    args.roomId?.trim() ||
    args.roomName?.trim()?.toLowerCase().replace(/[^a-z0-9]+/g, "-") ||
    "clip";
  const clipIndex = args.clipIndex ?? 0;
  return `${args.listingId}:${roomKey}:${clipIndex}`;
}

function mapClipVersionToVideoItem(clipVersion: DBClipVersion): ContentItem {
  return {
    id: clipVersion.clipId,
    clipVersionId: clipVersion.id,
    thumbnail: clipVersion.thumbnailUrl ?? undefined,
    videoUrl: clipVersion.videoUrl ?? undefined,
    category: clipVersion.category ?? undefined,
    durationSeconds: clipVersion.durationSeconds ?? undefined,
    generationModel: clipVersion.generationModel ?? undefined,
    orientation: clipVersion.orientation ?? undefined,
    aspectRatio: "vertical",
    alt: clipVersion.roomName ? `${clipVersion.roomName} clip` : "Generated clip",
    roomId: clipVersion.roomId ?? undefined,
    roomName: clipVersion.roomName,
    clipIndex: clipVersion.clipIndex,
    sortOrder: clipVersion.sortOrder,
    aiDirections: clipVersion.aiDirections,
    versionNumber: clipVersion.versionNumber,
    isCurrentVersion: clipVersion.isCurrent,
    versionStatus: clipVersion.status,
    generatedAt: clipVersion.createdAt
  };
}

async function seedMissingClipVersions(listingId: string) {
  const [status, currentClipVersions] = await Promise.all([
    getListingVideoStatus(listingId),
    getCurrentClipVersionsByListingId(listingId)
  ]);

  const existingSourceJobIds = new Set(
    currentClipVersions
      .map((clipVersion) => clipVersion.sourceVideoGenJobId)
      .filter((value): value is string => Boolean(value))
  );

  const jobsToSeed = status.jobs.filter(
    (job) =>
      (job.videoUrl || job.thumbnailUrl) && !existingSourceJobIds.has(job.jobId)
  );

  await Promise.all(
    jobsToSeed.map((job) =>
      createClipVersion({
        id: nanoid(),
        clipId: buildStableClipId({
          listingId,
          roomId: job.roomId,
          roomName: job.roomName,
          clipIndex: job.clipIndex
        }),
        listingId,
        roomId: job.roomId ?? null,
        roomName: job.roomName?.trim() || "Generated Clip",
        category: job.category ?? "uncategorized",
        clipIndex: job.clipIndex ?? 0,
        sortOrder: job.sortOrder ?? 0,
        versionNumber: 1,
        status: job.status,
        isCurrent: true,
        videoUrl: job.videoUrl ?? null,
        thumbnailUrl: job.thumbnailUrl ?? null,
        durationSeconds: job.durationSeconds
          ? Math.round(job.durationSeconds)
          : null,
        metadata: {
          duration: job.durationSeconds ?? undefined,
          orientation: job.orientation ?? undefined
        },
        errorMessage: job.errorMessage ?? null,
        orientation: job.orientation ?? "vertical",
        generationModel: job.generationModel ?? "veo3.1_fast",
        imageUrls: [],
        prompt: "",
        aiDirections: "",
        sourceVideoGenJobId: job.jobId
      })
    )
  );
}

async function getListingClipVersionItems(listingId: string) {
  await seedMissingClipVersions(listingId);
  const currentClipVersions = await getCurrentClipVersionsByListingId(listingId);

  return await Promise.all(
    currentClipVersions
      .sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0))
      .map(async (clipVersion) => ({
        clipId: clipVersion.clipId,
        roomName: clipVersion.roomName,
        roomId: clipVersion.roomId ?? null,
        clipIndex: clipVersion.clipIndex,
        sortOrder: clipVersion.sortOrder,
        currentVersion: mapClipVersionToVideoItem(clipVersion),
        versions: (await getSuccessfulClipVersionsByClipId(clipVersion.id)).map(
          (version) => mapClipVersionToVideoItem(version)
        )
      }))
  );
}

export const getCurrentUserListingSummariesPage = withServerActionCaller(
  "getCurrentUserListingSummariesPage",
  async (params: { limit: number; offset: number }) => {
    const user = await requireAuthenticatedUser();
    return getUserListingSummariesPage(user.id, params);
  }
);

export async function getListingCreateViewData(
  userId: string,
  listingId: string
) {
  const [clipVersionItems, listingImages, listingPostItems] = await Promise.all([
    getListingClipVersionItems(listingId),
    getListingImages(userId, listingId),
    getAllCachedListingContentForCreate({ userId, listingId })
  ]);

  const videoItems: ContentItem[] = clipVersionItems
    .map((clipItem) => clipItem.currentVersion)
    .filter((clipVersion) => clipVersion.videoUrl || clipVersion.thumbnail);

  return {
    videoItems,
    clipVersionItems,
    listingPostItems,
    listingImages: listingImages.map(mapListingImageToDisplayItem)
  };
}

export const getListingCreateViewDataForCurrentUser = withServerActionCaller(
  "getListingCreateViewDataForCurrentUser",
  async (listingId: string) => {
    const user = await requireAuthenticatedUser();
    await requireListingAccess(listingId, user.id);
    return getListingCreateViewData(user.id, listingId);
  }
);

export const getListingClipVersionItemsForCurrentUser = withServerActionCaller(
  "getListingClipVersionItemsForCurrentUser",
  async (listingId: string) => {
    const user = await requireAuthenticatedUser();
    await requireListingAccess(listingId, user.id);
    return getListingClipVersionItems(listingId);
  }
);
