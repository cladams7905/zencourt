import { NextRequest, NextResponse } from "next/server";
import { and, eq, isNotNull, isNull, asc } from "drizzle-orm";
import { db, videos } from "@db/client";
import {
  ApiError,
  requireAuthenticatedUser,
  requireProjectAccess
} from "../../_utils";

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
      throw new ApiError(400, {
        error: "Invalid request",
        message: "projectId query parameter is required"
      });
    }

    const user = await requireAuthenticatedUser();
    await requireProjectAccess(projectId, user.id);

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

    return NextResponse.json({
      success: true,
      projectId,
      rooms: serializeRoomVideos(roomVideos)
    });
  } catch (error) {
    if (error instanceof ApiError) {
      return NextResponse.json(error.body, { status: error.status });
    }

    console.error("[video/rooms] Failed to fetch room statuses", error);
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
