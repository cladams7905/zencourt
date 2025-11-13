import { NextRequest, NextResponse } from "next/server";
import { and, eq, isNotNull, isNull, asc } from "drizzle-orm";
import { db, videos } from "@db/client";
import {
  ApiError,
  requireAuthenticatedUser,
  requireProjectAccess
} from "../../_utils";
import {
  createChildLogger,
  logger as baseLogger
} from "../../../../../lib/logger";

const logger = createChildLogger(baseLogger, {
  module: "video-rooms-route"
});

function serializeRoomVideos(records: typeof videos.$inferSelect[]) {
  return records.map((video) => ({
    id: video.id,
    roomId: video.roomId,
    roomName: video.roomName,
    status: video.status,
    videoUrl:
      !video.videoUrl || video.videoUrl === "pending" ? null : video.videoUrl,
    errorMessage: video.errorMessage
  }));
}

export async function GET(request: NextRequest) {
  try {
    const projectId = request.nextUrl.searchParams.get("projectId");
    if (!projectId) {
      logger.warn("Rooms request missing projectId query param");
      throw new ApiError(400, {
        error: "Invalid request",
        message: "projectId query parameter is required"
      });
    }

    const user = await requireAuthenticatedUser();
    await requireProjectAccess(projectId, user.id);
    logger.info(
      { projectId, userId: user.id },
      "Fetching active room videos for project"
    );

    const roomVideos = await db
      .select()
      .from(videos)
      .where(
        and(
          eq(videos.projectId, projectId),
          isNotNull(videos.roomId),
          isNull(videos.archivedAt)
        )
      )
      .orderBy(asc(videos.createdAt));

    logger.info(
      { projectId, roomCount: roomVideos.length },
      "Fetched active room videos"
    );

    return NextResponse.json({
      success: true,
      projectId,
      rooms: serializeRoomVideos(roomVideos)
    });
  } catch (error) {
    if (error instanceof ApiError) {
      logger.warn(
        {
          status: error.status,
          body: error.body
        },
        "Rooms request failed with ApiError"
      );
      return NextResponse.json(error.body, { status: error.status });
    }

    logger.error(
      { err: error },
      "Rooms request failed with unexpected error"
    );
    return NextResponse.json(
      {
        error: "Internal server error",
        message:
          error instanceof Error ? error.message : "Unable to fetch room videos"
      },
      { status: 500 }
    );
  }
}
