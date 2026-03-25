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
  createVideoClip,
  createVideoClipVersion,
  getCurrentVideoClipVersionsByListingId,
  getVideoGenBatchById,
  getVideoGenJobById,
  getSuccessfulVideoClipVersionsByClipId,
  getVideoClipById,
  getVideoClipVersionBySourceVideoGenJobId,
  updateVideoClipVersion,
  updateVideoGenBatch,
  updateVideoGenJob,
  updateVideoClip
} from "@web/src/server/models/videoGen";
import type { DBVideoClip, DBVideoClipVersion } from "@db/types/models";
import {
  getClipRegenerationHardTimeoutMs,
  isPastTimeout,
  VIDEO_GENERATION_TIMEOUT_MESSAGE
} from "@web/src/lib/domain/listing/videoGenerationTimeouts";

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

  const existingSourceJobIds = new Set(
    currentClipVersions
      .map((clipVersion) => clipVersion.sourceVideoGenJobId)
      .filter((value): value is string => Boolean(value))
  );
  const currentVersionNumbersByClipId = new Map(
    currentClipVersions.map((clipVersion) => [
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

async function expireTimedOutClipRegenerations(
  clipVersions: DBVideoClipVersion[]
): Promise<void> {
  const timedOutClipVersions = clipVersions.filter(
    (clipVersion) =>
      ["pending", "processing"].includes(clipVersion.status) &&
      isPastTimeout(clipVersion.createdAt, getClipRegenerationHardTimeoutMs())
  );

  await Promise.all(
    timedOutClipVersions.map(async (clipVersion) => {
      await updateVideoClipVersion(clipVersion.id, {
        status: "failed",
        errorMessage: VIDEO_GENERATION_TIMEOUT_MESSAGE
      });

      if (!clipVersion.sourceVideoGenJobId) {
        return;
      }

      const job = await getVideoGenJobById(clipVersion.sourceVideoGenJobId);
      if (job && ["pending", "processing"].includes(job.status)) {
        await updateVideoGenJob(job.id, {
          status: "failed",
          errorMessage: VIDEO_GENERATION_TIMEOUT_MESSAGE
        });

        const batch = await getVideoGenBatchById(job.videoGenBatchId);
        if (batch && ["pending", "processing"].includes(batch.status)) {
          await updateVideoGenBatch(batch.id, {
            status: "failed",
            errorMessage: VIDEO_GENERATION_TIMEOUT_MESSAGE
          });
        }
      }
    })
  );
}

async function getListingClipVersionItems(listingId: string) {
  await seedMissingVideoClips(listingId);
  const currentClipVersions = await getCurrentVideoClipVersionsByListingId(listingId);
  await expireTimedOutClipRegenerations(currentClipVersions);
  const refreshedClipVersions =
    await getCurrentVideoClipVersionsByListingId(listingId);

  return await Promise.all(
    refreshedClipVersions.map(async (clipVersion) => {
      const clip = await getVideoClipById(clipVersion.videoClipId);

      if (!clip) {
        throw new Error(`Video clip ${clipVersion.videoClipId} not found`);
      }

      const successfulVersions = (
        await getSuccessfulVideoClipVersionsByClipId(clip.id)
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
