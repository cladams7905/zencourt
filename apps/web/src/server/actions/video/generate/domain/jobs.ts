import { nanoid } from "nanoid";
import { ApiError } from "@web/src/server/errors/api";
import { isPriorityCategory } from "@shared/utils";
import { buildPrompt } from "@web/src/server/services/videoGeneration/domain/prompt";
import {
  buildRoomsFromImages,
  getCategoryForRoom,
  selectPrimaryImageForRoom,
  selectSecondaryImageForRoom
} from "@web/src/server/services/videoGeneration/domain/rooms";
import { getVideoGenerationConfig } from "@web/src/server/services/videoGeneration/config";
import type { InsertDBVideoGenBatch, InsertDBVideoGenJob } from "@db/types/models";
import type { JobGenerationSettings, VideoOrientation } from "@shared/types/models";
import type {
  GroupedListingImages,
  ListingRoom,
  ResolvePublicDownloadUrls
} from "../types";

function validateRoomsExist(rooms: unknown[]): void {
  if (rooms.length === 0) {
    throw new ApiError(400, {
      error: "Invalid request",
      message: "At least one room is required to generate videos"
    });
  }
}

function findImageByUrl(
  groupedImages: GroupedListingImages,
  category: string,
  imageUrl: string
) {
  return (groupedImages.get(category) || []).find((img) => img.url === imageUrl);
}

async function buildPrimaryJobRecord(args: {
  parentVideoId: string;
  room: ListingRoom;
  category: string;
  groupedImages: GroupedListingImages;
  listingPrimaryImageUrl: string;
  orientation: VideoOrientation;
  aiDirections?: string;
  sortOrder: number;
  previousTemplateKey: string | null;
  resolvePublicDownloadUrls: ResolvePublicDownloadUrls;
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
    previousTemplateKey,
    resolvePublicDownloadUrls
  } = args;

  const roomWithCategory = { ...room, category };
  const primaryImageUrl = selectPrimaryImageForRoom(
    roomWithCategory,
    groupedImages,
    listingPrimaryImageUrl
  );
  const primaryImage = findImageByUrl(groupedImages, category, primaryImageUrl);
  const publicPrimaryUrls = resolvePublicDownloadUrls([primaryImageUrl]);
  const primaryPrompt = buildPrompt({
    roomName: room.name,
    category,
    perspective: primaryImage?.metadata?.perspective,
    previousTemplateKey
  });

  return {
    record: {
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
    },
    primaryImageUrl,
    nextTemplateKey: primaryPrompt.templateKey
  };
}

async function buildSecondaryJobRecord(args: {
  parentVideoId: string;
  room: ListingRoom;
  category: string;
  groupedImages: GroupedListingImages;
  primaryImageUrl: string;
  orientation: VideoOrientation;
  aiDirections?: string;
  sortOrder: number;
  previousTemplateKey: string | null;
  resolvePublicDownloadUrls: ResolvePublicDownloadUrls;
}): Promise<{ record: InsertDBVideoGenJob; nextTemplateKey: string | null } | null> {
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
    previousTemplateKey,
    resolvePublicDownloadUrls
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

  const secondaryImage = findImageByUrl(groupedImages, category, secondaryImageUrl);
  const publicSecondaryUrls = resolvePublicDownloadUrls([secondaryImageUrl]);
  const secondaryPrompt = buildPrompt({
    roomName: room.name,
    category,
    perspective: secondaryImage?.metadata?.perspective,
    previousTemplateKey
  });

  return {
    record: {
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
    },
    nextTemplateKey: secondaryPrompt.templateKey
  };
}

async function processRoomForJobRecords(args: {
  parentVideoId: string;
  room: ListingRoom;
  groupedImages: GroupedListingImages;
  listingPrimaryImageUrl: string;
  orientation: VideoOrientation;
  aiDirections?: string;
  sortOrder: number;
  previousTemplateKey: string | null;
  resolvePublicDownloadUrls: ResolvePublicDownloadUrls;
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
    previousTemplateKey,
    resolvePublicDownloadUrls
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
    previousTemplateKey,
    resolvePublicDownloadUrls
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
      previousTemplateKey: currentTemplateKey,
      resolvePublicDownloadUrls
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

export async function buildJobRecords(args: {
  parentVideoId: string;
  groupedImages: GroupedListingImages;
  listingPrimaryImageUrl: string;
  orientation: VideoOrientation;
  aiDirections?: string;
  resolvePublicDownloadUrls: ResolvePublicDownloadUrls;
}): Promise<InsertDBVideoGenJob[]> {
  const {
    parentVideoId,
    groupedImages,
    listingPrimaryImageUrl,
    orientation,
    aiDirections,
    resolvePublicDownloadUrls
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
      previousTemplateKey,
      resolvePublicDownloadUrls
    });
    allRecords.push(...result.records);
    sortOrder = result.nextSortOrder;
    previousTemplateKey = result.nextTemplateKey;
  }

  return allRecords;
}

export function createParentVideoBatchRecord(listingId: string): {
  id: string;
  record: InsertDBVideoGenBatch;
} {
  const parentVideoId = nanoid();
  return {
    id: parentVideoId,
    record: {
      id: parentVideoId,
      listingId,
      status: "pending",
      errorMessage: null
    }
  };
}

export function extractJobIds(records: InsertDBVideoGenJob[]): string[] {
  return records.map((record) => record.id);
}
