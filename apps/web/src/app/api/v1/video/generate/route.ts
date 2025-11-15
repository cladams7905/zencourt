/**
 * API Route: Generate individual room videos via the video-server
 *
 * POST /api/v1/video/generate
 */

import { NextRequest, NextResponse } from "next/server";
import { nanoid } from "nanoid";
import { eq, asc, DrizzleQueryError } from "drizzle-orm";
import { db, images } from "@db/client";
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
import { createVideo } from "@web/src/server/actions/db/videos";
import { createVideoJob } from "@web/src/server/actions/db/videoJobs";

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

function buildPrompt(roomName: string, aiDirections?: string): string {
  const basePrompt = `Create a cinematic walkthrough video showcasing the ${roomName} inside a property listing. Highlight the key architectural details and ambience.`;
  if (!aiDirections) {
    return basePrompt;
  }

  return `${basePrompt} Additional creative direction: ${aiDirections}`;
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

function selectImageUrlsForRoom(
  room: { id: string; name: string; category: string; roomNumber?: number },
  groupedImages: Map<string, DBImage[]>
): string[] {
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

    return [image.url];
  }

  return availableImages
    .filter((image) => Boolean(image.url))
    .slice(0, maxImages)
    .map((image) => image.url!) as string[];
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

    const projectImages = await db
      .select()
      .from(images)
      .where(eq(images.projectId, body.projectId))
      .orderBy(asc(images.sortOrder));

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
      projectId: body.projectId,
      status: "pending",
      videoUrl: null,
      thumbnailUrl: null,
      metadata: null,
      errorMessage: null
    };

    await createVideo(parentVideo);

    logger.info(
      {
        parentVideoId,
        projectId: body.projectId
      },
      "Created parent video record"
    );

    // Step 2: Create video_jobs records directly from rooms
    const videoJobRecords: InsertDBVideoJob[] = body.rooms.map(
      (room, index) => {
        const category = getCategoryForRoom(room);
        const roomWithCategory = { ...room, category };
        const imageUrls = selectImageUrlsForRoom(
          roomWithCategory,
          groupedImages
        );
        const prompt = buildPrompt(room.name, body.aiDirections);
        const jobId = nanoid();

        return {
          id: jobId,
          videoId: parentVideoId,
          requestId: null,
          status: "pending",
          videoUrl: null,
          thumbnailUrl: null,
          generationModel: "kling1.6",
          generationSettings: {
            model: "kling1.6",
            orientation,
            aiDirections: body.aiDirections || "",
            imageUrls,
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
      }
    );

    // Create all video jobs
    for (const jobRecord of videoJobRecords) {
      await createVideoJob(jobRecord);
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
