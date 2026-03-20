import { db, listingImages, eq, asc } from "@db/client";
import { nanoid } from "nanoid";
import { ApiError } from "@web/src/server/errors/api";
import {
  createChildLogger,
  logger as baseLogger
} from "@web/src/lib/core/logging/logger";
import {
  createVideoClipVersion,
  createVideoGenBatch,
  createVideoGenJobsBatch,
  getVideoClipById,
  getLatestVideoClipVersionByClipId,
  getVideoClipVersionById,
  updateVideoClip,
  updateVideoGenJob
} from "@web/src/server/models/videoGen";
import { getVideoGenerationConfig } from "@web/src/server/services/videoGeneration/config";
import {
  groupImagesByCategory,
  selectListingPrimaryImage
} from "@web/src/server/services/videoGeneration/domain/rooms";
import {
  buildJobRecords,
  createParentVideoBatchRecord,
  extractJobIds
} from "./domain/jobs";
import {
  cancelVideoServerGeneration,
  enqueueVideoServerJobs
} from "./infra/videoServer";
import type { DBListingImage } from "@db/types/models";
import type {
  CancelListingVideoGenerationArgs,
  CancelListingVideoGenerationResult,
  RegenerateListingClipVersionArgs,
  RegenerateListingClipVersionResult,
  StartListingVideoGenerationArgs
} from "./types";

const logger = createChildLogger(baseLogger, {
  module: "video-generation-actions"
});

async function fetchListingImages(
  listingId: string
): Promise<DBListingImage[]> {
  return (await db
    .select()
    .from(listingImages)
    .where(eq(listingImages.listingId, listingId))
    .orderBy(asc(listingImages.uploadedAt))) as DBListingImage[];
}

function validateImagesExist(listingImageRows: DBListingImage[]): void {
  if (listingImageRows.length === 0) {
    throw new ApiError(400, {
      error: "Missing images",
      message: "Listing is missing property images"
    });
  }
}

export async function startListingVideoGeneration(
  args: StartListingVideoGenerationArgs
): Promise<{ batchId: string; jobCount: number }> {
  const { listingId, userId, aiDirections, resolvePublicDownloadUrls } = args;
  const config = getVideoGenerationConfig();
  const orientation = args.orientation ?? config.defaultOrientation;

  const listingImageRows = await fetchListingImages(listingId);
  validateImagesExist(listingImageRows);

  const groupedImages = groupImagesByCategory(listingImageRows);
  const listingPrimaryImage = selectListingPrimaryImage(listingImageRows);
  const { id: parentVideoId, record: parentVideo } =
    createParentVideoBatchRecord(listingId);

  await createVideoGenBatch(parentVideo);

  const records = await buildJobRecords({
    parentVideoId,
    groupedImages,
    listingPrimaryImageUrl: listingPrimaryImage.url,
    orientation,
    aiDirections,
    resolvePublicDownloadUrls
  });

  await createVideoGenJobsBatch(records);
  const jobIds = extractJobIds(records);

  await enqueueVideoServerJobs({
    parentVideoId,
    jobIds,
    listingId,
    userId
  });

  logger.info(
    {
      listingId,
      userId,
      parentVideoId,
      jobIds,
      jobCount: records.length,
      orientation
    },
    "Started listing video generation"
  );

  return {
    batchId: parentVideoId,
    jobCount: records.length
  };
}

export async function cancelVideoGenerationBatch(
  args: CancelListingVideoGenerationArgs
): Promise<CancelListingVideoGenerationResult> {
  const result = await cancelVideoServerGeneration(args);

  logger.info(
    {
      batchId: result.batchId,
      canceledBatches: result.canceledBatches,
      canceledJobs: result.canceledJobs
    },
    "Canceled video generation batch via video server"
  );

  return result;
}

export async function regenerateListingClipVersion(
  args: RegenerateListingClipVersionArgs
): Promise<RegenerateListingClipVersionResult> {
  const { listingId, userId, clipId, aiDirections } = args;

  try {
    const currentClip = await getVideoClipById(clipId);

    if (!currentClip) {
      throw new ApiError(404, {
        error: "Clip not found",
        message: "Video clip not found"
      });
    }

    const currentClipVersionId = currentClip.currentVideoClipVersionId;
    if (!currentClipVersionId) {
      throw new ApiError(400, {
        error: "Missing current clip version",
        message: "This clip does not have a current version to regenerate."
      });
    }

    const currentClipVersion =
      await getVideoClipVersionById(currentClipVersionId);

    if (!currentClipVersion) {
      throw new ApiError(404, {
        error: "Clip version not found",
        message: "Current clip version not found"
      });
    }

    const latestClipVersion =
      await getLatestVideoClipVersionByClipId(currentClip.id);
    const nextVersionNumber =
      (latestClipVersion?.versionNumber ?? currentClipVersion.versionNumber) + 1;

    const parentVideoId = nanoid();
    const jobId = nanoid();
    const nextClipVersionId = nanoid();
    const resolvedAiDirections =
      typeof aiDirections === "string"
        ? aiDirections
        : currentClipVersion.aiDirections;
    const resolvedImageUrls = currentClipVersion.imageUrls ?? [];
    const resolvedPrompt = currentClipVersion.prompt?.trim() ?? "";

    if (!resolvedImageUrls.length || !resolvedPrompt) {
      throw new ApiError(400, {
        error: "Missing regeneration inputs",
        message:
          "This clip cannot be regenerated yet because its original generation inputs are missing."
      });
    }

    await createVideoGenBatch({
      id: parentVideoId,
      listingId,
      status: "pending",
      errorMessage: null
    });

    await createVideoGenJobsBatch([
      {
        id: jobId,
        videoGenBatchId: parentVideoId,
        requestId: null,
        videoClipId: currentClip.id,
        videoClipVersionId: null,
        status: "pending",
        videoUrl: null,
        thumbnailUrl: null,
        generationSettings: {
          model: currentClipVersion.generationModel,
          orientation: currentClipVersion.orientation,
          aiDirections: resolvedAiDirections ?? "",
          imageUrls: args.resolvePublicDownloadUrls(resolvedImageUrls),
          prompt: resolvedPrompt,
          category: currentClip.category,
          sortOrder: currentClip.sortOrder,
          roomId: currentClip.roomId ?? undefined,
          roomName: currentClip.roomName,
          clipIndex: currentClip.clipIndex
        },
        metadata: {
          orientation: currentClipVersion.orientation
        },
        errorMessage: null
      }
    ]);

    await createVideoClipVersion({
      id: nextClipVersionId,
      videoClipId: currentClip.id,
      versionNumber: nextVersionNumber,
      status: "pending",
      videoUrl: null,
      thumbnailUrl: null,
      durationSeconds: null,
      metadata: currentClipVersion.metadata ?? null,
      errorMessage: null,
      orientation: currentClipVersion.orientation,
      generationModel: currentClipVersion.generationModel,
      imageUrls: resolvedImageUrls,
      prompt: resolvedPrompt,
      aiDirections: resolvedAiDirections ?? "",
      sourceVideoGenJobId: jobId
    });

    await updateVideoClip(currentClip.id, {
      currentVideoClipVersionId: nextClipVersionId
    });

    await updateVideoGenJob(jobId, {
      videoClipVersionId: nextClipVersionId
    });

    await enqueueVideoServerJobs({
      parentVideoId,
      jobIds: [jobId],
      listingId,
      userId
    });

    return {
      clipId: currentClip.id,
      clipVersionId: nextClipVersionId,
      batchId: parentVideoId
    };
  } catch (error) {
    logger.error(
      {
        listingId,
        userId,
        clipId,
        error
      },
      "Failed to regenerate listing clip version"
    );
    throw error;
  }
}

export type { CancelListingVideoGenerationResult } from "./types";
