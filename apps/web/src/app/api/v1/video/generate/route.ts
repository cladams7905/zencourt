/**
 * API Route: Generate individual room videos via the video-server
 *
 * POST /api/v1/video/generate
 */

import { NextRequest, NextResponse } from "next/server";
import { nanoid } from "nanoid";
import { eq, asc, DrizzleQueryError } from "drizzle-orm";
import { db, listingImages } from "@db/client";
import {
  ApiError,
  requireAuthenticatedUser,
  requireListingAccess
} from "../../_utils";
import { VideoGenerateRequest, VideoGenerateResponse } from "@shared/types/api";
import {
  isPriorityCategory
} from "@shared/types/video";
import { getVideoServerConfig } from "../_config";
import { ROOM_CATEGORIES, RoomCategory } from "@web/src/types/vision";
import {
  createChildLogger,
  logger as baseLogger
} from "../../../../../lib/logger";
import {
  DBListingImage,
  JobGenerationSettings,
  InsertDBVideoGenBatch,
  InsertDBVideoGenJob
} from "@shared/types/models";
import { createVideoGenBatch } from "@web/src/server/actions/db/videoGenBatch";
import { createVideoGenJob } from "@web/src/server/actions/db/videoGenJobs";
import { getSignedDownloadUrls } from "@web/src/server/utils/storageUrls";

const logger = createChildLogger(baseLogger, {
  module: "video-generate-route"
});

const DEFAULT_DURATION: "5" | "10" = "5";
const CLIP_DURATION_SECONDS = 4;
const PROMPT_CONSTRAINTS =
  "No people. No added objects. Keep architecture and materials unchanged.";

function getCategoryForRoom(room: { id: string; category?: string }): string {
  if (room.category) {
    return room.category;
  }

  if (ROOM_CATEGORIES[room.id as RoomCategory]) {
    return room.id;
  }

  const trimmed = room.id.replace(/-\d+$/, "");
  if (ROOM_CATEGORIES[trimmed as RoomCategory]) {
    return trimmed;
  }

  return trimmed;
}

function buildPrompt(args: {
  roomName: string;
  category: string;
  perspective?: "aerial" | "ground";
  previousTemplateKey?: string | null;
}): { prompt: string; templateKey: string } {
  const { roomName, category, perspective, previousTemplateKey } = args;

  const baseCategory = category.replace(/-\d+$/, "");
  const metadata = ROOM_CATEGORIES[baseCategory as RoomCategory];
  const isExterior = metadata?.group === "exterior";

  const promptInfo = pickPromptTemplate({
    category: baseCategory,
    isExterior,
    perspective,
    previousTemplateKey
  });

  const displayRoomName =
    baseCategory === "exterior-front"
      ? "front of the house"
      : baseCategory === "exterior-backyard"
        ? "back of the house"
        : roomName;

  const motionPrompt = promptInfo.template
    .replace(/\{roomName\}/g, displayRoomName)
    .trim();

  const prompt = `${motionPrompt} ${PROMPT_CONSTRAINTS}`;

  logger.debug(
    { prompt, templateKey: promptInfo.key },
    `Constructed prompt for ${roomName}`
  );

  return { prompt, templateKey: promptInfo.key };
}

function groupImagesByCategory(
  listingImagesByCategory: DBListingImage[]
): Map<string, DBListingImage[]> {
  const grouped = new Map<string, DBListingImage[]>();

  listingImagesByCategory.forEach((image) => {
    if (!image.category || !image.url) {
      return;
    }

    const category = image.category;
    if (!grouped.has(category)) {
      grouped.set(category, []);
    }

    grouped.get(category)!.push(image);
  });

  grouped.forEach((imagesForCategory) => {
    imagesForCategory.sort((a, b) => {
      const primaryA = a.isPrimary ? 1 : 0;
      const primaryB = b.isPrimary ? 1 : 0;
      if (primaryA !== primaryB) {
        return primaryB - primaryA;
      }
      const timeA = a.uploadedAt ? new Date(a.uploadedAt).getTime() : 0;
      const timeB = b.uploadedAt ? new Date(b.uploadedAt).getTime() : 0;
      return timeA - timeB;
    });
  });

  return grouped;
}

type DerivedRoom = VideoGenerateRequest["rooms"][number];

function buildRoomsFromImages(
  groupedImages: Map<string, DBListingImage[]>
): DerivedRoom[] {
  const categories = Array.from(groupedImages.keys());
  if (categories.length === 0) {
    return [];
  }

  const baseOrder = Object.values(ROOM_CATEGORIES)
    .sort((a, b) => a.order - b.order)
    .map((category) => category.id);

  const used = new Set<string>();
  const ordered: string[] = [];

  baseOrder.forEach((base) => {
    const matches = categories
      .filter(
        (category) => category === base || category.startsWith(`${base}-`)
      )
      .sort((a, b) => {
        const getSuffix = (value: string) => {
          const match = value.match(/-(\d+)$/);
          return match ? Number(match[1]) : 0;
        };
        return getSuffix(a) - getSuffix(b);
      });
    matches.forEach((match) => {
      ordered.push(match);
      used.add(match);
    });
  });

  const remaining = categories
    .filter((category) => !used.has(category))
    .sort((a, b) => a.localeCompare(b));

  const orderedCategories = [...ordered, ...remaining];

  return orderedCategories.map((category) => {
    const base = category.replace(/-\d+$/, "");
    const metadata = ROOM_CATEGORIES[base as RoomCategory];
    const label =
      metadata?.label ??
      base.replace(/-/g, " ").replace(/\b\w/g, (char) => char.toUpperCase());
    const numberMatch = category.match(/-(\d+)$/);
    const roomNumber = numberMatch ? Number(numberMatch[1]) : undefined;
    const name =
      metadata?.allowNumbering && roomNumber ? `${label} ${roomNumber}` : label;

    return {
      id: category,
      name,
      category,
      roomNumber,
      imageCount: groupedImages.get(category)?.length ?? 0
    };
  });
}

interface RoomAssetSelection {
  imageUrls: string[];
}

type PromptTemplate = {
  key: string;
  template: string;
};

const INTERIOR_TEMPLATES: PromptTemplate[] = [
  {
    key: "interior-forward-pan",
    template: "Forward pan through the {roomName}."
  },
  {
    key: "interior-center-push",
    template: "Steady push-in toward the center of the {roomName}."
  },
  {
    key: "interior-corner-reveal",
    template: "Gentle corner reveal into the {roomName}."
  }
];

const EXTERIOR_AERIAL_TEMPLATES: PromptTemplate[] = [
  {
    key: "exterior-aerial-flyover",
    template:
      "Aerial flyover of the {roomName}, gliding forward above the property."
  },
  {
    key: "exterior-aerial-orbit",
    template: "Smooth orbit around the {roomName}, aerial perspective."
  },
  {
    key: "exterior-aerial-descend",
    template: "Descending aerial shot toward the {roomName}."
  },
  {
    key: "exterior-aerial-sweep",
    template: "Aerial sweep across the {roomName}, wide cinematic movement."
  }
];

const EXTERIOR_GROUND_TEMPLATES: PromptTemplate[] = [
  {
    key: "exterior-ground-approach",
    template: "Steady approach toward the {roomName}."
  },
  {
    key: "exterior-ground-lateral",
    template: "Lateral tracking pan across the {roomName}."
  },
  {
    key: "exterior-ground-orbit",
    template: "Steady pan around the {roomName}."
  }
];

const CATEGORY_TEMPLATES: Partial<Record<RoomCategory, PromptTemplate[]>> = {
  bathroom: [
    {
      key: "bathroom-slow-push",
      template: "Slow camera pan into the {roomName}."
    }
  ],
  bedroom: [
    {
      key: "bedroom-center-push",
      template: "Steady camera movement toward the center of the {roomName}."
    }
  ]
};

function pickPromptTemplate(args: {
  category: string;
  isExterior: boolean;
  perspective?: "aerial" | "ground";
  previousTemplateKey?: string | null;
}): PromptTemplate {
  const { category, isExterior, perspective, previousTemplateKey } = args;
  const baseTemplates = isExterior
    ? perspective === "ground"
      ? EXTERIOR_GROUND_TEMPLATES
      : EXTERIOR_AERIAL_TEMPLATES
    : INTERIOR_TEMPLATES;
  const overrides = CATEGORY_TEMPLATES[category as RoomCategory] ?? undefined;
  const pool = overrides ? [...overrides, ...baseTemplates] : baseTemplates;

  if (pool.length === 1) {
    return pool[0];
  }

  const filtered = previousTemplateKey
    ? pool.filter((item) => item.key !== previousTemplateKey)
    : pool;

  const pickFrom = filtered.length > 0 ? filtered : pool;
  const index = Math.floor(Math.random() * pickFrom.length);
  return pickFrom[index];
}

function selectRoomAssetsForRoom(
  room: { id: string; name: string; category: string; roomNumber?: number },
  groupedImages: Map<string, DBListingImage[]>
): RoomAssetSelection {
  const availableImages = groupedImages.get(room.category) || [];
  if (availableImages.length === 0) {
    throw new ApiError(400, {
      error: "Missing images",
      message: `No categorized images found for ${room.name}`
    });
  }

  const metadata = ROOM_CATEGORIES[room.category as RoomCategory];
  const maxImages = 3;

  if (metadata?.allowNumbering) {
    const primaryImage = availableImages.find((image) => image.isPrimary);
    if (primaryImage?.url) {
      return {
        imageUrls: [primaryImage.url]
      };
    }
    const index =
      typeof room.roomNumber === "number" && room.roomNumber > 0
        ? room.roomNumber - 1
        : parseInt(room.id.split("-").pop() || "1", 10) - 1;

    const image = availableImages[index];
    if (!image || !image.url) {
      throw new ApiError(400, {
        error: "Missing images",
        message: `Not enough ${room.category} images for ${room.name}`
      });
    }

    return {
      imageUrls: [image.url]
    };
  }

  const imageUrls = availableImages
    .filter((image) => Boolean(image.url))
    .slice(0, maxImages)
    .map((image) => image.url!) as string[];

  return {
    imageUrls
  };
}

function selectSecondaryImageForRoom(
  room: { id: string; name: string; category: string; roomNumber?: number },
  groupedImages: Map<string, DBListingImage[]>,
  primaryImageUrl: string
): RoomAssetSelection | null {
  const availableImages = groupedImages.get(room.category) || [];

  const candidates = availableImages
    .filter((img) => img.url && img.url !== primaryImageUrl)
    .sort((a, b) => {
      const scoreA = a.primaryScore ?? -1;
      const scoreB = b.primaryScore ?? -1;
      return scoreB - scoreA;
    });

  if (candidates.length === 0) {
    return null;
  }

  return { imageUrls: [candidates[0].url!] };
}

async function enqueueVideoServerJob(
  parentVideoId: string,
  jobIds: string[],
  listingId: string,
  userId: string
) {
  const { baseUrl, apiKey } = getVideoServerConfig();

  logger.info(
    {
      parentVideoId,
      listingId,
      userId,
      jobCount: jobIds.length,
      jobIds
    },
    "Queuing video generation jobs for video server"
  );

  const response = await fetch(`${baseUrl}/video/generate`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-API-Key": apiKey
    },
    body: JSON.stringify({
      videoId: parentVideoId,
      jobIds,
      listingId,
      userId
    })
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    const message =
      errorData.error || errorData.message || "Video server request failed";

    logger.error(
      {
        parentVideoId,
        listingId,
        responseStatus: response.status,
        message
      },
      "Video server request failed while queuing jobs"
    );

    throw new ApiError(response.status, {
      error: "Video server error",
      message
    });
  }
}

export async function POST(
  request: NextRequest
): Promise<NextResponse<VideoGenerateResponse>> {
  try {
    const body: VideoGenerateRequest = await request.json();
    const user = await requireAuthenticatedUser();
    const listing = await requireListingAccess(body.listingId, user.id);

    logger.info(
      {
        userId: user.id,
        listingId: listing.id
      },
      "Video generation request authorized"
    );

    const orientation = body.orientation || "vertical";
    const duration = body.duration || DEFAULT_DURATION;

    const listingImageRows: DBListingImage[] = (await db
      .select()
      .from(listingImages)
      .where(eq(listingImages.listingId, listing.id))
      .orderBy(asc(listingImages.uploadedAt))) as DBListingImage[];

    if (listingImageRows.length === 0) {
      logger.error(
        { listingId: listing.id },
        "Video generation request missing images"
      );
      throw new ApiError(400, {
        error: "Missing images",
        message: "Listing is missing property images"
      });
    }

    const groupedImages = groupImagesByCategory(listingImageRows);
    const rooms =
      body.rooms && body.rooms.length > 0
        ? body.rooms
        : buildRoomsFromImages(groupedImages);

    if (rooms.length === 0) {
      logger.warn(
        { listingId: body.listingId },
        "Video generation request missing rooms"
      );
      throw new ApiError(400, {
        error: "Invalid request",
        message: "At least one room is required to generate videos"
      });
    }

    logger.info(
      {
        listingId: body.listingId,
        roomCount: rooms.length,
        orientation,
        duration
      },
      "Preparing new video generation"
    );

    // Step 1: Create single parent video generation batch with status="pending"
    const parentVideoId = nanoid();
    const parentVideo: InsertDBVideoGenBatch = {
      id: parentVideoId,
      listingId: listing.id,
      status: "pending",
      errorMessage: null
    };

    await createVideoGenBatch(parentVideo);

    logger.info(
      {
        parentVideoId,
        listingId: body.listingId
      },
      "Created parent video record"
    );

    // Step 2: Create video_gen_jobs records directly from rooms
    const videoJobRecords: InsertDBVideoGenJob[] = [];
    let previousTemplateKey: string | null = null;
    let sortOrderCounter = 0;

    for (let index = 0; index < rooms.length; index += 1) {
      const room = rooms[index];
      const category = getCategoryForRoom(room);
      const roomWithCategory = { ...room, category };
      const { imageUrls } = selectRoomAssetsForRoom(
        roomWithCategory,
        groupedImages
      );
      const primaryImage = (groupedImages.get(category) || []).find(
        (img) => img.url === imageUrls[0]
      );
      const perspective = primaryImage?.metadata?.perspective;
      let publicImageUrls: string[];
      try {
        publicImageUrls = await getSignedDownloadUrls(imageUrls);
      } catch (error) {
        logger.error(
          {
            listingId: body.listingId,
            roomId: room.id,
            err: error instanceof Error ? error.message : String(error)
          },
          "Failed to ensure public image URLs"
        );
        throw new ApiError(500, {
          error: "storage_error",
          message: "Failed to generate signed image URLs for video generation"
        });
      }
      const promptResult = buildPrompt({
        roomName: room.name,
        category,
        perspective,
        previousTemplateKey
      });
      previousTemplateKey = promptResult.templateKey;
      const durationSeconds = CLIP_DURATION_SECONDS;
      const jobId = nanoid();

      videoJobRecords.push({
        id: jobId,
        videoGenBatchId: parentVideoId,
        requestId: null,
        status: "pending",
        videoUrl: null,
        thumbnailUrl: null,
        generationModel: "veo3.1_fast",
        generationSettings: {
          model: "veo3.1_fast",
          orientation,
          aiDirections: body.aiDirections || "",
          imageUrls: publicImageUrls,
          prompt: promptResult.prompt,
          category,
          sortOrder: sortOrderCounter,
          durationSeconds,
          roomId: room.id,
          roomName: room.name,
          roomNumber: room.roomNumber,
          clipIndex: 0
        } as JobGenerationSettings,
        metadata: {
          orientation
        },
        errorMessage: null
      });
      sortOrderCounter++;

      // Create a 2nd clip for priority categories using the next-best image
      if (isPriorityCategory(category)) {
        const primaryImageUrl = imageUrls[0];
        const secondarySelection = selectSecondaryImageForRoom(
          roomWithCategory,
          groupedImages,
          primaryImageUrl
        );

        if (secondarySelection) {
          const secondaryImage = (groupedImages.get(category) || []).find(
            (img) => img.url === secondarySelection.imageUrls[0]
          );
          const secondaryPerspective = secondaryImage?.metadata?.perspective;
          let publicSecondaryUrls: string[];
          try {
            publicSecondaryUrls = await getSignedDownloadUrls(
              secondarySelection.imageUrls
            );
          } catch (error) {
            logger.warn(
              {
                listingId: body.listingId,
                roomId: room.id,
                err: error instanceof Error ? error.message : String(error)
              },
              "Failed to get signed URLs for secondary clip, skipping"
            );
            continue;
          }

          const secondaryPrompt = buildPrompt({
            roomName: room.name,
            category,
            perspective: secondaryPerspective,
            previousTemplateKey
          });
          previousTemplateKey = secondaryPrompt.templateKey;
          const secondaryJobId = nanoid();

          videoJobRecords.push({
            id: secondaryJobId,
            videoGenBatchId: parentVideoId,
            requestId: null,
            status: "pending",
            videoUrl: null,
            thumbnailUrl: null,
            generationModel: "veo3.1_fast",
            generationSettings: {
              model: "veo3.1_fast",
              orientation,
              aiDirections: body.aiDirections || "",
              imageUrls: publicSecondaryUrls,
              prompt: secondaryPrompt.prompt,
              category,
              sortOrder: sortOrderCounter,
              durationSeconds,
              roomId: room.id,
              roomName: room.name,
              roomNumber: room.roomNumber,
              clipIndex: 1
            } as JobGenerationSettings,
            metadata: {
              orientation
            },
            errorMessage: null
          });
          sortOrderCounter++;
        }
      }
    }

    // Create all video jobs
    for (const jobRecord of videoJobRecords) {
      await createVideoGenJob(jobRecord);
    }

    const jobIds = videoJobRecords.map((r) => r.id);

    logger.info(
      {
        parentVideoId,
        listingId: body.listingId,
        jobCount: videoJobRecords.length,
        jobIds
      },
      "Created video job records"
    );

    // Step 3: Enqueue jobs to video server
    await enqueueVideoServerJob(parentVideoId, jobIds, listing.id, user.id);

    logger.info(
      {
        parentVideoId,
        listingId: listing.id,
        userId: user.id,
        jobCount: videoJobRecords.length
      },
      "Successfully enqueued video generation to video server"
    );

    // Step 4: Return parent videoId and job ids
    return NextResponse.json(
      {
        success: true,
        message: "Video generation started",
        listingId: body.listingId,
        videoId: parentVideoId,
        jobIds: jobIds,
        jobCount: videoJobRecords.length
      },
      { status: 202 }
    );
  } catch (error) {
    if (error instanceof ApiError) {
      logger.error(
        {
          status: error.status,
          body: error.body
        },
        "Video generation request failed with ApiError"
      );
      return NextResponse.json(
        {
          error: error.body.message,
          success: false,
          listingId: "",
          videoId: "",
          jobIds: [],
          jobCount: 0
        },
        { status: error.status }
      );
    } else if (error instanceof DrizzleQueryError) {
      logger.error(
        { err: error.message },
        "Video generation request failed with DrizzleQueryError"
      );
      return NextResponse.json(
        {
          error: error.message,
          success: false,
          listingId: "",
          videoId: "",
          jobIds: [],
          jobCount: 0
        },
        { status: 500 }
      );
    }

    return NextResponse.json(
      {
        error: "Internal server error",
        message:
          error instanceof Error ? error.message : "Unable to start generation",
        success: false,
        listingId: "",
        videoId: "",
        jobIds: [],
        jobCount: 0
      },
      { status: 500 }
    );
  }
}
