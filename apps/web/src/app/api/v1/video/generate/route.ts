/**
 * API Route: Generate individual room videos via the video-server
 *
 * POST /api/v1/video/generate
 */

import { NextRequest, NextResponse } from "next/server";
import { nanoid } from "nanoid";
import { eq, asc, desc, and, DrizzleQueryError } from "drizzle-orm";
import { db, assets, collectionImages, collections } from "@db/client";
import {
  ApiError,
  requireAuthenticatedUser,
  requireProjectAccess
} from "../../_utils";
import { VideoGenerateRequest, VideoGenerateResponse } from "@shared/types/api";
import { getVideoServerConfig } from "../_config";
import { ROOM_CATEGORIES, RoomCategory } from "@web/src/types/vision";
import {
  createChildLogger,
  logger as baseLogger
} from "../../../../../lib/logger";
import {
  DBImage,
  JobGenerationSettings,
  InsertDBVideo,
  InsertDBVideoJob
} from "@shared/types/models";
import { createVideoAsset } from "@web/src/server/actions/db/videoAssets";
import { createVideoAssetJob } from "@web/src/server/actions/db/videoAssetJobs";
import { ensurePublicUrls } from "@web/src/server/utils/storageUrls";

const logger = createChildLogger(baseLogger, {
  module: "video-generate-route"
});

const DEFAULT_DURATION: "5" | "10" = "5";

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

function buildPrompt(
  roomName: string,
  roomDescription?: string | null,
  aiDirections?: string
): string {
  const descriptionPart = roomDescription?.trim()
    ? ` ${roomDescription.trim()}`
    : "";
  const basePrompt = `Smooth camera pan through ${roomName}. Camera should move very slowly through the space.${descriptionPart}`;

  if (!aiDirections?.trim()) {
    logger.debug({ basePrompt }, `Constructed prompt for ${roomName}`);
    return basePrompt;
  } else {
    const additionalCreativeDirection = !!aiDirections
      ? `Additional creative direction: ${aiDirections.trim()}`
      : "";
    const finalPrompt = basePrompt + additionalCreativeDirection;

    logger.debug({ finalPrompt }, `Constructed prompt for ${roomName}`);

    return finalPrompt;
  }
}

function groupImagesByCategory(
  projectImages: DBImage[]
): Map<string, DBImage[]> {
  const grouped = new Map<string, DBImage[]>();

  projectImages.forEach((image) => {
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
      const orderA = a.sortOrder ?? 0;
      const orderB = b.sortOrder ?? 0;
      return orderA - orderB;
    });
  });

  return grouped;
}

interface RoomAssetSelection {
  imageUrls: string[];
  roomDescription?: string | null;
}

function selectRoomAssetsForRoom(
  room: { id: string; name: string; category: string; roomNumber?: number },
  groupedImages: Map<string, DBImage[]>
): RoomAssetSelection {
  const availableImages = groupedImages.get(room.category) || [];
  if (availableImages.length === 0) {
    throw new ApiError(400, {
      error: "Missing images",
      message: `No categorized images found for ${room.name}`
    });
  }

  const metadata = ROOM_CATEGORIES[room.category as RoomCategory];
  const maxImages = 4;

  if (metadata?.allowNumbering) {
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
      imageUrls: [image.url],
      roomDescription: image.sceneDescription
    };
  }

  const imageUrls = availableImages
    .filter((image) => Boolean(image.url))
    .slice(0, maxImages)
    .map((image) => image.url!) as string[];

  const descriptionSource = availableImages.find((image) =>
    Boolean(image.sceneDescription)
  );

  return {
    imageUrls,
    roomDescription: descriptionSource?.sceneDescription ?? null
  };
}

async function enqueueVideoServerJob(
  parentVideoId: string,
  jobIds: string[],
  projectId: string,
  userId: string
) {
  const { baseUrl, apiKey } = getVideoServerConfig();

  logger.info(
    {
      parentVideoId,
      projectId,
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
      projectId,
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
        projectId,
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
    const project = await requireProjectAccess(body.projectId, user.id);

    logger.info(
      {
        userId: user.id,
        projectId: project.id
      },
      "Video generation request authorized"
    );

    // Validate rooms
    if (!body.rooms || body.rooms.length === 0) {
      logger.warn(
        { projectId: body.projectId },
        "Video generation request missing rooms"
      );
      throw new ApiError(400, {
        error: "Invalid request",
        message: "At least one room is required to generate videos"
      });
    }

    const orientation = body.orientation || "landscape";
    const duration = body.duration || DEFAULT_DURATION;

    const [collection] = await db
      .select()
      .from(collections)
      .where(eq(collections.projectId, project.id))
      .limit(1);

    if (!collection) {
      logger.error(
        { projectId: project.id },
        "Video generation request missing collection"
      );
      throw new ApiError(400, {
        error: "Missing collection",
        message: "Project is missing its collection of property images"
      });
    }

    const [projectAsset] = await db
      .select()
      .from(assets)
      .where(and(eq(assets.projectId, project.id), eq(assets.type, "video")))
      .orderBy(desc(assets.createdAt))
      .limit(1);

    if (!projectAsset) {
      logger.error(
        { projectId: project.id },
        "Video generation request missing asset"
      );
      throw new ApiError(400, {
        error: "Missing asset",
        message: "Project is missing its video asset configuration"
      });
    }

    const projectImages: DBImage[] = (await db
      .select()
      .from(collectionImages)
      .where(eq(collectionImages.collectionId, collection.id))
      .orderBy(asc(collectionImages.sortOrder))) as DBImage[];

    const groupedImages = groupImagesByCategory(projectImages);

    logger.info(
      {
        projectId: body.projectId,
        roomCount: body.rooms.length,
        orientation,
        duration
      },
      "Preparing new video generation"
    );

    // Step 1: Create single parent video record with status="pending"
    const parentVideoId = nanoid();
    const parentVideo: InsertDBVideo = {
      id: parentVideoId,
      assetId: projectAsset.id,
      status: "pending",
      videoUrl: null,
      thumbnailUrl: null,
      metadata: null,
      errorMessage: null
    };

    await createVideoAsset(parentVideo);

    logger.info(
      {
        parentVideoId,
        projectId: body.projectId
      },
      "Created parent video record"
    );

    // Step 2: Create video_jobs records directly from rooms
    const videoJobRecords: InsertDBVideoJob[] = await Promise.all(
      body.rooms.map(async (room, index) => {
        const category = getCategoryForRoom(room);
        const roomWithCategory = { ...room, category };
        const { imageUrls, roomDescription } = selectRoomAssetsForRoom(
          roomWithCategory,
          groupedImages
        );
        let publicImageUrls: string[];
        try {
          publicImageUrls = await ensurePublicUrls(imageUrls);
        } catch (error) {
          logger.error(
            {
              projectId: body.projectId,
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
        const prompt = buildPrompt(
          room.name,
          roomDescription,
          body.aiDirections
        );
        const jobId = nanoid();

        return {
          id: jobId,
          videoAssetId: parentVideoId,
          requestId: null,
          status: "pending",
          videoUrl: null,
          thumbnailUrl: null,
          generationModel: "kling1.6",
          generationSettings: {
            model: "kling1.6",
            orientation,
            aiDirections: body.aiDirections || "",
            imageUrls: publicImageUrls,
            prompt,
            category,
            sortOrder: index,
            roomId: room.id,
            roomName: room.name,
            roomNumber: room.roomNumber
          } as JobGenerationSettings,
          metadata: {
            orientation
          },
          errorMessage: null,
          errorType: null,
          errorRetryable: null,
          processingStartedAt: null,
          processingCompletedAt: null,
          deliveryAttempedAt: null,
          deliveryAttemptCount: 0,
          deliveryLastError: null,
          archivedAt: null
        };
      })
    );

    // Create all video jobs
    for (const jobRecord of videoJobRecords) {
      await createVideoAssetJob(jobRecord);
    }

    const jobIds = videoJobRecords.map((r) => r.id);

    logger.info(
      {
        parentVideoId,
        projectId: body.projectId,
        jobCount: videoJobRecords.length,
        jobIds
      },
      "Created video job records"
    );

    // Step 3: Enqueue jobs to video server
    await enqueueVideoServerJob(parentVideoId, jobIds, project.id, user.id);

    logger.info(
      {
        parentVideoId,
        projectId: project.id,
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
        projectId: body.projectId,
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
          projectId: "",
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
          projectId: "",
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
        projectId: "",
        videoId: "",
        jobIds: [],
        jobCount: 0
      },
      { status: 500 }
    );
  }
}
