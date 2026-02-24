import { nanoid } from "nanoid";
import { db, listingImages, eq, asc } from "@db/client";
import { ApiError } from "@web/src/server/utils/apiError";
import {
  createChildLogger,
  logger as baseLogger
} from "@web/src/lib/core/logging/logger";
import { createVideoGenBatch } from "@web/src/server/actions/db/videoGenBatch";
import { createVideoGenJobsBatch } from "@web/src/server/actions/db/videoGenJobs";
import { getPublicDownloadUrls } from "@web/src/server/utils/storageUrls";
import { isPriorityCategory } from "@shared/utils";
import type {
  DBListingImage,
  InsertDBVideoGenBatch,
  InsertDBVideoGenJob
} from "@db/types/models";
import type {
  JobGenerationSettings,
  VideoOrientation
} from "@shared/types/models";
import { buildPrompt } from "./domain/prompt";
import {
  buildRoomsFromImages,
  getCategoryForRoom,
  groupImagesByCategory,
  selectListingPrimaryImage,
  selectPrimaryImageForRoom,
  selectSecondaryImageForRoom
} from "./domain/rooms";
import { getVideoGenerationConfig } from "./config";
import { requireListingAccess } from "@web/src/server/utils/listingAccess";

const logger = createChildLogger(baseLogger, {
  module: "video-generation-service"
});

export type CancelListingVideoGenerationResult = {
  success: true;
  listingId: string;
  canceledVideos: number;
  canceledJobs: number;
};

function buildVideoServerRequestBody(args: {
  parentVideoId: string;
  jobIds: string[];
  listingId: string;
  userId: string;
}): string {
  const config = getVideoGenerationConfig();
  const callbackUrl = `${config.appUrl}/api/v1/webhooks/video`;

  return JSON.stringify({
    videoId: args.parentVideoId,
    jobIds: args.jobIds,
    listingId: args.listingId,
    userId: args.userId,
    callbackUrl
  });
}

async function handleVideoServerError(response: Response): Promise<never> {
  const errorData = await response.json().catch(() => ({}));
  const message =
    errorData.error || errorData.message || "Video server request failed";

  throw new ApiError(response.status, {
    error: "Video server error",
    message
  });
}

async function enqueueVideoServerJobs(args: {
  parentVideoId: string;
  jobIds: string[];
  listingId: string;
  userId: string;
}): Promise<void> {
  const config = getVideoGenerationConfig();
  const requestBody = buildVideoServerRequestBody(args);

  const response = await fetch(`${config.videoServerBaseUrl}/video/generate`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-API-Key": config.videoServerApiKey
    },
    body: requestBody
  });

  if (!response.ok) {
    await handleVideoServerError(response);
  }
}

function validateRoomsExist(rooms: unknown[]): void {
  if (rooms.length === 0) {
    throw new ApiError(400, {
      error: "Invalid request",
      message: "At least one room is required to generate videos"
    });
  }
}

function findImageByUrl(
  groupedImages: Map<string, DBListingImage[]>,
  category: string,
  imageUrl: string
): DBListingImage | undefined {
  return (groupedImages.get(category) || []).find(
    (img) => img.url === imageUrl
  );
}

async function buildPrimaryJobRecord(args: {
  parentVideoId: string;
  room: ReturnType<typeof buildRoomsFromImages>[0];
  category: string;
  groupedImages: Map<string, DBListingImage[]>;
  listingPrimaryImageUrl: string;
  orientation: VideoOrientation;
  aiDirections?: string;
  sortOrder: number;
  previousTemplateKey: string | null;
}): Promise<{
  record: InsertDBVideoGenJob;
  primaryImageUrl: string;
  nextTemplateKey: string | null;
}> {
  const config = getVideoGenerationConfig();
  const {
    parentVideoId,
    room,
    category,
    groupedImages,
    listingPrimaryImageUrl,
    orientation,
    aiDirections,
    sortOrder,
    previousTemplateKey
  } = args;

  const roomWithCategory = { ...room, category };
  const primaryImageUrl = selectPrimaryImageForRoom(
    roomWithCategory,
    groupedImages,
    listingPrimaryImageUrl
  );
  const primaryImage = findImageByUrl(groupedImages, category, primaryImageUrl);
  const publicPrimaryUrls = getPublicDownloadUrls([primaryImageUrl]);

  const primaryPrompt = buildPrompt({
    roomName: room.name,
    category,
    perspective: primaryImage?.metadata?.perspective,
    previousTemplateKey
  });

  const record: InsertDBVideoGenJob = {
    id: nanoid(),
    videoGenBatchId: parentVideoId,
    requestId: null,
    status: "pending",
    videoUrl: null,
    thumbnailUrl: null,
    generationSettings: {
      model: config.model as JobGenerationSettings["model"],
      orientation,
      aiDirections: aiDirections || "",
      imageUrls: publicPrimaryUrls,
      prompt: primaryPrompt.prompt,
      category,
      sortOrder,
      roomId: room.id,
      roomName: room.name,
      roomNumber: room.roomNumber,
      clipIndex: 0
    } as JobGenerationSettings,
    metadata: { orientation },
    errorMessage: null
  };

  return {
    record,
    primaryImageUrl,
    nextTemplateKey: primaryPrompt.templateKey
  };
}

async function buildSecondaryJobRecord(args: {
  parentVideoId: string;
  room: ReturnType<typeof buildRoomsFromImages>[0];
  category: string;
  groupedImages: Map<string, DBListingImage[]>;
  primaryImageUrl: string;
  orientation: VideoOrientation;
  aiDirections?: string;
  sortOrder: number;
  previousTemplateKey: string | null;
}): Promise<{
  record: InsertDBVideoGenJob;
  nextTemplateKey: string | null;
} | null> {
  const config = getVideoGenerationConfig();
  const {
    parentVideoId,
    room,
    category,
    groupedImages,
    primaryImageUrl,
    orientation,
    aiDirections,
    sortOrder,
    previousTemplateKey
  } = args;

  const roomWithCategory = { ...room, category };
  const secondaryImageUrl = selectSecondaryImageForRoom(
    roomWithCategory,
    groupedImages,
    primaryImageUrl
  );

  if (!secondaryImageUrl) {
    return null;
  }

  const secondaryImage = findImageByUrl(
    groupedImages,
    category,
    secondaryImageUrl
  );
  const publicSecondaryUrls = getPublicDownloadUrls([secondaryImageUrl]);

  const secondaryPrompt = buildPrompt({
    roomName: room.name,
    category,
    perspective: secondaryImage?.metadata?.perspective,
    previousTemplateKey
  });

  const record: InsertDBVideoGenJob = {
    id: nanoid(),
    videoGenBatchId: parentVideoId,
    requestId: null,
    status: "pending",
    videoUrl: null,
    thumbnailUrl: null,
    generationSettings: {
      model: config.model as JobGenerationSettings["model"],
      orientation,
      aiDirections: aiDirections || "",
      imageUrls: publicSecondaryUrls,
      prompt: secondaryPrompt.prompt,
      category,
      sortOrder,
      roomId: room.id,
      roomName: room.name,
      roomNumber: room.roomNumber,
      clipIndex: 1
    } as JobGenerationSettings,
    metadata: { orientation },
    errorMessage: null
  };

  return {
    record,
    nextTemplateKey: secondaryPrompt.templateKey
  };
}

async function processRoomForJobRecords(args: {
  parentVideoId: string;
  room: ReturnType<typeof buildRoomsFromImages>[0];
  groupedImages: Map<string, DBListingImage[]>;
  listingPrimaryImageUrl: string;
  orientation: VideoOrientation;
  aiDirections?: string;
  sortOrder: number;
  previousTemplateKey: string | null;
}): Promise<{
  records: InsertDBVideoGenJob[];
  nextSortOrder: number;
  nextTemplateKey: string | null;
}> {
  const config = getVideoGenerationConfig();
  const {
    parentVideoId,
    room,
    groupedImages,
    listingPrimaryImageUrl,
    orientation,
    aiDirections,
    sortOrder,
    previousTemplateKey
  } = args;

  const category = getCategoryForRoom(room);
  const records: InsertDBVideoGenJob[] = [];

  const primaryResult = await buildPrimaryJobRecord({
    parentVideoId,
    room,
    category,
    groupedImages,
    listingPrimaryImageUrl,
    orientation,
    aiDirections,
    sortOrder,
    previousTemplateKey
  });

  records.push(primaryResult.record);
  let currentSortOrder = sortOrder + 1;
  let currentTemplateKey = primaryResult.nextTemplateKey;

  const shouldBuildSecondary =
    config.enablePrioritySecondary && isPriorityCategory(category);

  if (shouldBuildSecondary) {
    const secondaryResult = await buildSecondaryJobRecord({
      parentVideoId,
      room,
      category,
      groupedImages,
      primaryImageUrl: primaryResult.primaryImageUrl,
      orientation,
      aiDirections,
      sortOrder: currentSortOrder,
      previousTemplateKey: currentTemplateKey
    });

    if (secondaryResult) {
      records.push(secondaryResult.record);
      currentSortOrder += 1;
      currentTemplateKey = secondaryResult.nextTemplateKey;
    }
  }

  return {
    records,
    nextSortOrder: currentSortOrder,
    nextTemplateKey: currentTemplateKey
  };
}

async function buildJobRecords(args: {
  parentVideoId: string;
  groupedImages: Map<string, DBListingImage[]>;
  listingPrimaryImageUrl: string;
  orientation: VideoOrientation;
  aiDirections?: string;
}): Promise<InsertDBVideoGenJob[]> {
  const {
    parentVideoId,
    groupedImages,
    listingPrimaryImageUrl,
    orientation,
    aiDirections
  } = args;

  const rooms = buildRoomsFromImages(groupedImages);
  validateRoomsExist(rooms);

  const allRecords: InsertDBVideoGenJob[] = [];
  let sortOrder = 0;
  let previousTemplateKey: string | null = null;

  for (const room of rooms) {
    const result = await processRoomForJobRecords({
      parentVideoId,
      room,
      groupedImages,
      listingPrimaryImageUrl,
      orientation,
      aiDirections,
      sortOrder,
      previousTemplateKey
    });

    allRecords.push(...result.records);
    sortOrder = result.nextSortOrder;
    previousTemplateKey = result.nextTemplateKey;
  }

  return allRecords;
}

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

function createParentVideoBatchRecord(listingId: string): {
  id: string;
  record: InsertDBVideoGenBatch;
} {
  const parentVideoId = nanoid();
  const record: InsertDBVideoGenBatch = {
    id: parentVideoId,
    listingId,
    status: "pending",
    errorMessage: null
  };
  return { id: parentVideoId, record };
}

function extractJobIds(records: InsertDBVideoGenJob[]): string[] {
  return records.map((record) => record.id);
}

export async function startListingVideoGeneration(args: {
  listingId: string;
  userId: string;
  orientation?: VideoOrientation;
  aiDirections?: string;
}): Promise<{ videoId: string; jobIds: string[]; jobCount: number }> {
  const { listingId, userId, aiDirections } = args;
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
    aiDirections
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

export async function cancelListingVideoGeneration(args: {
  listingId: string;
  userId: string;
  reason?: string;
}): Promise<CancelListingVideoGenerationResult> {
  const { listingId, userId, reason } = args;
  await requireListingAccess(listingId, userId);

  const config = getVideoGenerationConfig();
  const response = await fetch(`${config.videoServerBaseUrl}/video/cancel`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-API-Key": config.videoServerApiKey
    },
    body: JSON.stringify({
      listingId,
      reason: reason ?? "Canceled via workflow"
    })
  });

  const payload = await response.json().catch(() => ({}));

  if (!response.ok) {
    const message =
      payload?.error ?? payload?.message ?? "Failed to cancel generation";
    throw new ApiError(response.status, {
      error: "Video server error",
      message
    });
  }

  logger.info(
    {
      listingId,
      canceledVideos: payload?.canceledVideos,
      canceledJobs: payload?.canceledJobs
    },
    "Canceled generation via video server"
  );

  return {
    success: true,
    listingId,
    canceledVideos: payload?.canceledVideos ?? 0,
    canceledJobs: payload?.canceledJobs ?? 0
  };
}
