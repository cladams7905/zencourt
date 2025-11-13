/**
 * API Route: Generate individual room videos via the video-server
 *
 * POST /api/v1/video/generate
 */

import { NextRequest, NextResponse } from "next/server";
import { nanoid } from "nanoid";
import { eq, asc, DrizzleQueryError } from "drizzle-orm";
import { db, images, videos } from "@db/client";
import {
  ApiError,
  requireAuthenticatedUser,
  requireProjectAccess
} from "../../_utils";
import { VideoGenerateRequest } from "@shared/types/api";
import { getVideoServerConfig } from "../_config";
import { ROOM_CATEGORIES, RoomCategory } from "@web/src/types/vision";
import { archiveRoomVideosForProject } from "@web/src/server/services/videoArchive";
import {
  createChildLogger,
  logger as baseLogger
} from "../../../../../lib/logger";
import { DBImage, DBVideo } from "@shared/types/models";

interface RoomSelection {
  id: string;
  name: string;
  category: string;
  roomNumber?: number;
  imageCount?: number;
}

interface RoomJob {
  selection: RoomSelection;
  videoId: string;
  imageUrls: string[];
  prompt: string;
}

const logger = createChildLogger(baseLogger, {
  module: "video-generate-route"
});

const DEFAULT_DURATION: "5" | "10" = "5";

function normalizeRooms(body: VideoGenerateRequest): RoomSelection[] {
  if (body.rooms && body.rooms.length > 0) {
    return body.rooms.map((room) => {
      const category =
        room.category ||
        deriveCategoryFromId(room.id) ||
        room.id.replace(/-\d+$/, "");
      return {
        id: room.id,
        name: room.name,
        category,
        roomNumber: room.roomNumber,
        imageCount: room.imageCount
      };
    });
  }

  // Backwards compatibility for older payloads that only provided roomOrder IDs
  const legacyRooms =
    (body as unknown as { compositionSettings?: { roomOrder?: string[] } })
      .compositionSettings?.roomOrder || [];

  return legacyRooms.map((roomId) => ({
    id: roomId,
    name: roomId,
    category: deriveCategoryFromId(roomId) || roomId.replace(/-\d+$/, "")
  }));
}

function deriveCategoryFromId(roomId: string): string | undefined {
  if (ROOM_CATEGORIES[roomId as RoomCategory]) {
    return roomId;
  }

  const trimmed = roomId.replace(/-\d+$/, "");
  if (ROOM_CATEGORIES[trimmed as RoomCategory]) {
    return trimmed;
  }

  return undefined;
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
      const orderA = a.order ?? 0;
      const orderB = b.order ?? 0;
      return orderA - orderB;
    });
  });

  return grouped;
}

function selectImageUrlsForRoom(
  selection: RoomSelection,
  groupedImages: Map<string, DBImage[]>
): string[] {
  const availableImages = groupedImages.get(selection.category) || [];
  if (availableImages.length === 0) {
    throw new ApiError(400, {
      error: "Missing images",
      message: `No categorized images found for ${selection.name}`
    });
  }

  const metadata = ROOM_CATEGORIES[selection.category as RoomCategory];
  const maxImages = 4;

  if (metadata?.allowNumbering) {
    const index =
      typeof selection.roomNumber === "number" && selection.roomNumber > 0
        ? selection.roomNumber - 1
        : parseInt(selection.id.split("-").pop() || "1", 10) - 1;

    const image = availableImages[index];
    if (!image || !image.url) {
      throw new ApiError(400, {
        error: "Missing images",
        message: `Not enough ${selection.category} images for ${selection.name}`
      });
    }

    return [image.url];
  }

  return availableImages
    .filter((image) => Boolean(image.url))
    .slice(0, maxImages)
    .map((image) => image.url!) as string[];
}

function mapVideosToResponse(videos: DBVideo[]) {
  return videos.map((video) => ({
    id: video.id,
    roomId: video.roomId,
    roomName: video.roomName,
    status: video.status,
    videoUrl:
      !video.videoUrl || video.videoUrl === "pending" ? null : video.videoUrl,
    errorMessage: video.errorMessage
  }));
}

async function enqueueRoomJobs(
  jobs: RoomJob[],
  projectId: string,
  userId: string,
  orientation: "landscape" | "vertical",
  duration: "5" | "10"
) {
  const aspectRatio = orientation === "vertical" ? "9:16" : "16:9";
  const { baseUrl, apiKey } = getVideoServerConfig();

  for (const job of jobs) {
    logger.info(
      {
        jobId: job.videoId,
        projectId,
        userId,
        roomId: job.selection.id,
        roomCategory: job.selection.category,
        orientation,
        duration
      },
      "Queuing room video generation job"
    );

    const response = await fetch(`${baseUrl}/video/generate`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-API-Key": apiKey
      },
      body: JSON.stringify({
        videoId: job.videoId,
        projectId,
        userId,
        roomId: job.selection.category,
        roomName: job.selection.name,
        prompt: job.prompt,
        imageUrls: job.imageUrls,
        duration,
        aspectRatio,
        metadata: {
          roomId: job.selection.id,
          roomNumber: job.selection.roomNumber,
          category: job.selection.category
        }
      })
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      const message =
        errorData.error || errorData.message || "Video server request failed";

      logger.error(
        {
          jobId: job.videoId,
          projectId,
          responseStatus: response.status,
          message
        },
        "Video server request failed while queuing room job"
      );

      await db
        .update(videos)
        .set({
          status: "failed",
          errorMessage: message,
          updatedAt: new Date()
        })
        .where(eq(videos.id, job.videoId));

      throw new ApiError(response.status, {
        error: "Video server error",
        message
      });
    }
  }
}

export async function POST(request: NextRequest) {
  try {
    const body: VideoGenerateRequest = await request.json();
    const user = await requireAuthenticatedUser();
    const project = await requireProjectAccess(body.projectId, user.id);

    logger.info(
      {
        userId: user.id,
        projectId: project.id,
        archiveLabel: body.archiveLabel
      },
      "Video generation request authorized"
    );

    const rooms = normalizeRooms(body);
    if (!rooms.length) {
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
      .orderBy(asc(images.order));

    const groupedImages = groupImagesByCategory(projectImages);

    await archiveRoomVideosForProject(body.projectId, {
      label: body.archiveLabel
    });

    logger.info(
      {
        projectId: body.projectId,
        roomCount: rooms.length,
        orientation,
        duration
      },
      "Archived previous room videos and preparing new jobs"
    );

    const jobs: RoomJob[] = rooms.map((selection) => {
      const imageUrls = selectImageUrlsForRoom(selection, groupedImages);
      const prompt = buildPrompt(selection.name, body.aiDirections);

      return {
        selection,
        videoId: nanoid(),
        imageUrls,
        prompt
      };
    });

    const videoRecords = jobs.map((job) => ({
      id: job.videoId,
      projectId: body.projectId,
      roomId: job.selection.id,
      roomName: job.selection.name,
      videoUrl: null,
      thumbnailUrl: null,
      duration: null,
      status: "processing" as const,
      generationSettings: {
        orientation,
        aiDirections: body.aiDirections,
        imageUrls: job.imageUrls,
        prompt: job.prompt,
        category: job.selection.category,
        roomNumber: job.selection.roomNumber
      },
      falRequestId: null,
      errorMessage: null
    }));

    const createdVideos = await db
      .insert(videos)
      .values(videoRecords)
      .returning();

    await enqueueRoomJobs(jobs, project.id, user.id, orientation, duration);

    logger.info(
      {
        projectId: project.id,
        userId: user.id,
        roomCount: rooms.length
      },
      "Successfully enqueued all room video generation jobs"
    );

    return NextResponse.json(
      {
        success: true,
        message: "Room video generation started",
        projectId: body.projectId,
        rooms: mapVideosToResponse(createdVideos)
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
      return NextResponse.json(error.body, { status: error.status });
    } else if (error instanceof DrizzleQueryError) {
      logger.error(
        { err: error.message },
        "Video generation request failed with DrizzleQueryError"
      );
      return NextResponse.json(error.message, { status: 500 });
    }

    return NextResponse.json(
      {
        error: "Internal server error",
        message:
          error instanceof Error ? error.message : "Unable to start generation"
      },
      { status: 500 }
    );
  }
}
