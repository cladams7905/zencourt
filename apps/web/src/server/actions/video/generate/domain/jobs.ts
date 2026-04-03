import { nanoid } from "nanoid";
import { ApiError } from "@web/src/server/errors/api";
import { isPriorityCategory } from "@shared/utils";
import {
  buildNegativePrompt,
  buildPrompt
} from "@web/src/server/services/videoGeneration/domain/prompt";
import {
  buildRoomsFromImages,
  getImageMotionVariantId,
  getCategoryForRoom,
  getSelectedSceneImagesForRoom,
  hasPersistedSceneSelectionForRoom,
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
  imageUrl: string;
  imageMotionVariantId: JobGenerationSettings["motionVariantId"];
  imagePerspective?: "aerial" | "ground";
  orientation: VideoOrientation;
  sortOrder: number;
  clipIndex: number;
  previousTemplateKey: string | null;
  resolvePublicDownloadUrls: ResolvePublicDownloadUrls;
}): Promise<{
  record: InsertDBVideoGenJob;
  nextTemplateKey: string | null;
}> {
  const config = getVideoGenerationConfig();
  const {
    parentVideoId,
    room,
    category,
    imageUrl,
    imageMotionVariantId,
    imagePerspective,
    orientation,
    sortOrder,
    clipIndex,
    previousTemplateKey,
    resolvePublicDownloadUrls
  } = args;

  const publicPrimaryUrls = resolvePublicDownloadUrls([imageUrl]);
  const primaryPrompt = buildPrompt({
    roomName: room.name,
    category,
    perspective: imagePerspective,
    motionVariantId: imageMotionVariantId,
    previousTemplateKey
  });
  const negativePrompt = buildNegativePrompt();

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
        imageUrls: publicPrimaryUrls,
        prompt: primaryPrompt.prompt,
        negativePrompt,
        motionVariantId: imageMotionVariantId,
        category,
        sortOrder,
        roomId: room.id,
        roomName: room.name,
        roomNumber: room.roomNumber,
        clipIndex
      } as JobGenerationSettings,
      metadata: { orientation },
      errorMessage: null
    },
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
    motionVariantId: "default",
    previousTemplateKey
  });
  const negativePrompt = buildNegativePrompt();

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
        imageUrls: publicSecondaryUrls,
        prompt: secondaryPrompt.prompt,
        negativePrompt,
        motionVariantId: "default",
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

async function buildPersistedSceneJobRecords(args: {
  parentVideoId: string;
  room: ListingRoom;
  category: string;
  groupedImages: GroupedListingImages;
  orientation: VideoOrientation;
  sortOrder: number;
  previousTemplateKey: string | null;
  resolvePublicDownloadUrls: ResolvePublicDownloadUrls;
}): Promise<{
  records: InsertDBVideoGenJob[];
  nextSortOrder: number;
  nextTemplateKey: string | null;
}> {
  const {
    parentVideoId,
    room,
    category,
    groupedImages,
    orientation,
    sortOrder,
    previousTemplateKey,
    resolvePublicDownloadUrls
  } = args;

  const selectedImages = getSelectedSceneImagesForRoom(
    { ...room, category },
    groupedImages
  );
  const records: InsertDBVideoGenJob[] = [];
  let nextSortOrder = sortOrder;
  let nextTemplateKey = previousTemplateKey;

  for (const [index, image] of selectedImages.entries()) {
    const result = await buildPrimaryJobRecord({
      parentVideoId,
      room,
      category,
      imageUrl: image.url,
      imageMotionVariantId: getImageMotionVariantId(image),
      imagePerspective: image.metadata?.perspective,
      orientation,
      sortOrder: nextSortOrder,
      clipIndex: index,
      previousTemplateKey: nextTemplateKey,
      resolvePublicDownloadUrls
    });
    records.push(result.record);
    nextSortOrder += 1;
    nextTemplateKey = result.nextTemplateKey;
  }

  return {
    records,
    nextSortOrder,
    nextTemplateKey
  };
}

async function processRoomForJobRecords(args: {
  parentVideoId: string;
  room: ListingRoom;
  groupedImages: GroupedListingImages;
  listingPrimaryImageUrl: string;
  orientation: VideoOrientation;
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
    sortOrder,
    previousTemplateKey,
    resolvePublicDownloadUrls
  } = args;

  const category = getCategoryForRoom(room);
  const records: InsertDBVideoGenJob[] = [];

  if (
    hasPersistedSceneSelectionForRoom({ ...room, category }, groupedImages)
  ) {
    return buildPersistedSceneJobRecords({
      parentVideoId,
      room,
      category,
      groupedImages,
      orientation,
      sortOrder,
      previousTemplateKey,
      resolvePublicDownloadUrls
    });
  }

  const roomWithCategory = { ...room, category };
  const primaryImageUrl = selectPrimaryImageForRoom(
    roomWithCategory,
    groupedImages,
    listingPrimaryImageUrl
  );
  const primaryImage = findImageByUrl(groupedImages, category, primaryImageUrl);
  const primaryResult = await buildPrimaryJobRecord({
    parentVideoId,
    room,
    category,
    imageUrl: primaryImageUrl,
    imageMotionVariantId: "default",
    imagePerspective: primaryImage?.metadata?.perspective,
    orientation,
    sortOrder,
    clipIndex: 0,
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
      primaryImageUrl,
      orientation,
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
  resolvePublicDownloadUrls: ResolvePublicDownloadUrls;
}): Promise<InsertDBVideoGenJob[]> {
  const {
    parentVideoId,
    groupedImages,
    listingPrimaryImageUrl,
    orientation,
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
