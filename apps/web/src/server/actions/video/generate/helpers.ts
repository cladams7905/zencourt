import { db, listingImages, eq, asc } from "@db/client";
import { nanoid } from "nanoid";
import { ApiError } from "@web/src/server/errors/api";
import {
  createChildLogger,
  logger as baseLogger
} from "@web/src/lib/core/logging/logger";
import {
  createClipVersion,
  createVideoGenBatch,
  createVideoGenJobsBatch,
  getClipVersionById
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
): Promise<{ videoId: string; jobIds: string[]; jobCount: number }> {
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
    videoId: parentVideoId,
    jobIds,
    jobCount: records.length
  };
}

export async function cancelListingVideoGeneration(
  args: CancelListingVideoGenerationArgs
): Promise<CancelListingVideoGenerationResult> {
  const result = await cancelVideoServerGeneration(args);

  logger.info(
    {
      listingId: result.listingId,
      canceledVideos: result.canceledVideos,
      canceledJobs: result.canceledJobs
    },
    "Canceled generation via video server"
  );

  return result;
}

export async function regenerateListingClipVersion(
  args: RegenerateListingClipVersionArgs
): Promise<RegenerateListingClipVersionResult> {
  const { listingId, userId, clipId, aiDirections } = args;
  const currentClipVersion = await getClipVersionById(clipId);

  if (!currentClipVersion) {
    throw new ApiError(404, {
      error: "Clip not found",
      message: "Clip version not found"
    });
  }

  const parentVideoId = nanoid();
  const jobId = nanoid();
  const nextClipVersionId = nanoid();
  const resolvedAiDirections =
    typeof aiDirections === "string"
      ? aiDirections
      : currentClipVersion.aiDirections;

  await createVideoGenBatch({
    id: parentVideoId,
    listingId,
    status: "pending",
    errorMessage: null
  });

  await createClipVersion({
    id: nextClipVersionId,
    clipId: currentClipVersion.clipId,
    listingId,
    roomId: currentClipVersion.roomId,
    roomName: currentClipVersion.roomName,
    category: currentClipVersion.category,
    clipIndex: currentClipVersion.clipIndex,
    sortOrder: currentClipVersion.sortOrder,
    versionNumber: currentClipVersion.versionNumber + 1,
    status: "pending",
    isCurrent: false,
    videoUrl: null,
    thumbnailUrl: null,
    durationSeconds: null,
    metadata: currentClipVersion.metadata ?? null,
    errorMessage: null,
    orientation: currentClipVersion.orientation,
    generationModel: currentClipVersion.generationModel,
    imageUrls: currentClipVersion.imageUrls,
    prompt: currentClipVersion.prompt,
    aiDirections: resolvedAiDirections ?? "",
    sourceVideoGenJobId: jobId
  });

  await createVideoGenJobsBatch([
    {
      id: jobId,
      videoGenBatchId: parentVideoId,
      requestId: null,
      status: "pending",
      videoUrl: null,
      thumbnailUrl: null,
      generationSettings: {
        model: currentClipVersion.generationModel,
        orientation: currentClipVersion.orientation,
        aiDirections: resolvedAiDirections ?? "",
        imageUrls: args.resolvePublicDownloadUrls(currentClipVersion.imageUrls),
        prompt: currentClipVersion.prompt,
        category: currentClipVersion.category,
        sortOrder: currentClipVersion.sortOrder,
        roomId: currentClipVersion.roomId ?? undefined,
        roomName: currentClipVersion.roomName,
        clipIndex: currentClipVersion.clipIndex
      },
      metadata: {
        orientation: currentClipVersion.orientation
      },
      errorMessage: null
    }
  ]);

  await enqueueVideoServerJobs({
    parentVideoId,
    jobIds: [jobId],
    listingId,
    userId
  });

  return {
    clipId: currentClipVersion.clipId,
    clipVersionId: nextClipVersionId,
    jobId,
    videoId: parentVideoId
  };
}

export type { CancelListingVideoGenerationResult } from "./types";
