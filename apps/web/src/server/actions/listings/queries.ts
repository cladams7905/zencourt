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
import {
  getCachedListingContentForCreateFilter,
  type ListingMediaType
} from "@web/src/server/infra/cache/listingContent/cache";
import { getContentByListingId } from "@web/src/server/models/content";
import type { ContentItem } from "@web/src/components/dashboard/components/ContentGrid";
import { getUserMedia } from "@web/src/server/models/userMedia/queries";
import {
  createVideoClip,
  createVideoClipVersion,
  getCurrentVideoClipVersionsByListingId,
  getCurrentVideoClipsWithCurrentVersionsByListingId,
  getSuccessfulVideoClipVersionsByClipIds,
  getVideoClipById,
  getVideoClipVersionById,
  getVideoClipVersionBySourceVideoGenJobId,
  updateVideoClip
} from "@web/src/server/models/videoGen";
import type { DBVideoClip, DBVideoClipVersion } from "@db/types/models";
import { ApiError } from "@web/src/server/errors/api";
import { StatusCode } from "@shared/types/api";
import {
  buildSavedReelDedupKey,
  mapSavedReelContentToCreateItem,
  mapUserMediaToVideoItem
} from "./reelContent";
import { isSavedListingReelMetadata } from "@web/src/components/listings/create/shared/reels";
import {
  LISTING_CREATE_INITIAL_PAGE_SIZE,
  type ListingCreateMediaTab
} from "@web/src/components/listings/create/shared/constants";
import type { ListingContentSubcategory } from "@shared/types/models";

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

function buildClipDownloadFilename(
  roomName?: string | null,
  versionNumber?: number | null
) {
  const roomSegment =
    roomName?.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") ||
    "clip";
  const versionSegment = versionNumber ? `-v${versionNumber}` : "";
  return `${roomSegment}${versionSegment}.mp4`;
}

function mapClipVersionToVideoItem(
  clip: DBVideoClip,
  clipVersion: DBVideoClipVersion
): ContentItem {
  return {
    id: clip.id,
    clipVersionId: clipVersion.id,
    thumbnail: clipVersion.thumbnailUrl ?? undefined,
    videoUrl: clipVersion.videoUrl ?? undefined,
    category: clip.category ?? undefined,
    durationSeconds: clipVersion.durationSeconds ?? undefined,
    generationModel: clipVersion.generationModel ?? undefined,
    orientation: clipVersion.orientation ?? undefined,
    aspectRatio: "vertical",
    alt: clip.roomName ? `${clip.roomName} clip` : "Generated clip",
    roomId: clip.roomId ?? undefined,
    roomName: clip.roomName,
    clipIndex: clip.clipIndex,
    sortOrder: clip.sortOrder,
    aiDirections: clipVersion.aiDirections,
    versionNumber: clipVersion.versionNumber,
    versionStatus: clipVersion.status,
    generatedAt: clipVersion.createdAt
  };
}

async function seedMissingVideoClips(listingId: string) {
  const [status, currentClipVersions] = await Promise.all([
    getListingVideoStatus(listingId),
    getCurrentVideoClipVersionsByListingId(listingId)
  ]);
  const resolvedCurrentClipVersions = currentClipVersions.filter(
    (clipVersion): clipVersion is NonNullable<(typeof currentClipVersions)[number]> =>
      Boolean(clipVersion)
  );

  const existingSourceJobIds = new Set(
    resolvedCurrentClipVersions
      .map((clipVersion) => clipVersion.sourceVideoGenJobId)
      .filter((value): value is string => Boolean(value))
  );
  const currentVersionNumbersByClipId = new Map(
    resolvedCurrentClipVersions.map((clipVersion) => [
      clipVersion.videoClipId,
      clipVersion.versionNumber
    ])
  );

  const jobsToSeed = status.jobs.filter(
    (job) =>
      job.status === "completed" &&
      (job.videoUrl || job.thumbnailUrl) &&
      !existingSourceJobIds.has(job.jobId)
  );

  for (const job of jobsToSeed) {
    const alreadySeededVersion = await getVideoClipVersionBySourceVideoGenJobId(
      job.jobId
    );

    if (alreadySeededVersion) {
      currentVersionNumbersByClipId.set(
        alreadySeededVersion.videoClipId,
        alreadySeededVersion.versionNumber
      );
      continue;
    }

      const clipId = buildStableClipId({
        listingId,
        roomId: job.roomId,
        roomName: job.roomName,
        clipIndex: job.clipIndex
      });
      const existingClip = await getVideoClipById(clipId);
      const initialVersionId = nanoid();
      const nextVersionNumber =
        (currentVersionNumbersByClipId.get(clipId) ?? 0) + 1;

      if (!existingClip) {
        await createVideoClip({
          id: clipId,
          listingId,
          roomId: job.roomId ?? null,
          roomName: job.roomName?.trim() || "Generated Clip",
          category: job.category ?? "uncategorized",
          clipIndex: job.clipIndex ?? 0,
          sortOrder: job.sortOrder ?? 0,
          currentVideoClipVersionId: null
        });
      }

      await createVideoClipVersion({
        id: initialVersionId,
        videoClipId: clipId,
        versionNumber: nextVersionNumber,
        status: job.status,
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
        imageUrls: job.imageUrls ?? [],
        prompt: job.prompt ?? "",
        aiDirections: "",
        sourceVideoGenJobId: job.jobId
      });

      await updateVideoClip(clipId, {
        currentVideoClipVersionId: initialVersionId
      });
      currentVersionNumbersByClipId.set(clipId, nextVersionNumber);
  }
}

async function getListingClipVersionItems(listingId: string) {
  await seedMissingVideoClips(listingId);
  const currentClipRows = (
    await getCurrentVideoClipsWithCurrentVersionsByListingId(listingId)
  ).filter(
    (
      row
    ): row is NonNullable<
      Awaited<ReturnType<typeof getCurrentVideoClipsWithCurrentVersionsByListingId>>[number]
    > => Boolean(row?.clip && row?.clipVersion)
  );
  const successfulVersionsByClipId = await getSuccessfulVideoClipVersionsByClipIds(
    currentClipRows.map(({ clip }) => clip.id)
  );

  return await Promise.all(
    currentClipRows.map(async ({ clip, clipVersion }) => {
      const successfulVersions = (
        successfulVersionsByClipId.get(clip.id) ?? []
      ).map((version) => mapClipVersionToVideoItem(clip, version));
      const latestVersion = mapClipVersionToVideoItem(clip, clipVersion);
      const shouldFallbackToPreviousSuccessful =
        clipVersion.status === "failed" && Boolean(successfulVersions[0]);

      return {
        clipId: clip.id,
        roomName: clip.roomName,
        roomId: clip.roomId ?? null,
        clipIndex: clip.clipIndex,
        sortOrder: clip.sortOrder,
        currentVersion: shouldFallbackToPreviousSuccessful
          ? successfulVersions[0]
          : latestVersion,
        inFlightVersion: shouldFallbackToPreviousSuccessful
          ? latestVersion
          : null,
        versions: successfulVersions
      };
    })
  );
}

export async function getListingCreatePostItems(params: {
  userId: string;
  listingId: string;
  mediaTab?: ListingCreateMediaTab;
  subcategory?: ListingContentSubcategory;
}) {
  const activeMediaType: ListingMediaType =
    params.mediaTab === "images" ? "image" : "video";
  const activeSubcategory: ListingContentSubcategory =
    params.subcategory ?? "new_listing";
  const [cachedListingPostItems, savedContentRows] = await Promise.all([
    getCachedListingContentForCreateFilter({
      userId: params.userId,
      listingId: params.listingId,
      subcategory: activeSubcategory,
      mediaType: activeMediaType
    }),
    getContentByListingId(params.userId, params.listingId)
  ]);

  const savedReelItems = savedContentRows
    .map(mapSavedReelContentToCreateItem)
    .filter((item): item is ContentItem => Boolean(item))
    .filter(
      (item) =>
        item.listingSubcategory === activeSubcategory &&
        (item.mediaType ?? "video") === activeMediaType
    );
  const staleCacheKeys = new Set(
    savedContentRows
      .map((row) =>
        isSavedListingReelMetadata(row.metadata)
          ? buildSavedReelDedupKey(row.metadata)
          : null
      )
      .filter((value): value is string => Boolean(value))
  );

  return [
    ...savedReelItems,
    ...cachedListingPostItems
      .filter(
        (item) =>
          !staleCacheKeys.has(`${item.cacheKeyTimestamp}:${item.cacheKeyId}`)
      )
      .map((item) => ({
        ...item,
        contentSource: "cached_create" as const
      }))
  ].slice(0, LISTING_CREATE_INITIAL_PAGE_SIZE);
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
  listingId: string,
  options?: {
    initialMediaTab?: ListingCreateMediaTab;
    initialSubcategory?: ListingContentSubcategory;
  }
) {
  const [clipVersionItems, listingImages, listingPostItems, userMediaRows] = await Promise.all([
    getListingClipVersionItems(listingId),
    getListingImages(userId, listingId),
    getListingCreatePostItems({
      userId,
      listingId,
      mediaTab: options?.initialMediaTab,
      subcategory: options?.initialSubcategory
    }),
    getUserMedia(userId)
  ]);

  const listingClipItems: ContentItem[] = clipVersionItems
    .map((clipItem) => clipItem.currentVersion)
    .filter((clipVersion) => clipVersion.videoUrl || clipVersion.thumbnail)
    .map((clipVersion) => ({
      ...clipVersion,
      reelClipSource: "listing_clip" as const
    }));

  const userMediaVideoItems = userMediaRows
    .map(mapUserMediaToVideoItem)
    .filter((item): item is ContentItem => Boolean(item));

  return {
    videoItems: [...listingClipItems, ...userMediaVideoItems],
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

export const getListingClipDownloadForCurrentUser = withServerActionCaller(
  "getListingClipDownloadForCurrentUser",
  async (listingId: string, clipVersionId: string) => {
    const user = await requireAuthenticatedUser();
    await requireListingAccess(listingId, user.id);

    const clipVersion = await getVideoClipVersionById(clipVersionId);
    if (!clipVersion) {
      throw new ApiError(StatusCode.NOT_FOUND, {
        error: "Not found",
        message: "Clip version not found"
      });
    }

    const clip = await getVideoClipById(clipVersion.videoClipId);
    if (!clip || clip.listingId !== listingId) {
      throw new ApiError(StatusCode.NOT_FOUND, {
        error: "Not found",
        message: "Clip version not found"
      });
    }

    if (!clipVersion.videoUrl) {
      throw new ApiError(StatusCode.BAD_REQUEST, {
        error: "Invalid request",
        message: "No clip available to download"
      });
    }

    return {
      videoUrl: clipVersion.videoUrl,
      filename: buildClipDownloadFilename(clip.roomName, clipVersion.versionNumber)
    };
  }
);
