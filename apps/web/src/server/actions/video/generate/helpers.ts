import { db, listingImages, eq, asc } from "@db/client";
import { ApiError } from "@web/src/server/errors/api";
import {
  createChildLogger,
  logger as baseLogger
} from "@web/src/lib/core/logging/logger";
import { createVideoGenBatch } from "@web/src/server/models/videoGen";
import { createVideoGenJobsBatch } from "@web/src/server/models/videoGen";
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

export type { CancelListingVideoGenerationResult } from "./types";
