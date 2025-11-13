import { NextRequest, NextResponse } from "next/server";
import type { VideoArchiveRequest } from "@shared/types/api";
import {
  ApiError,
  requireAuthenticatedUser,
  requireProjectAccess
} from "../../_utils";
import { archiveRoomVideosForProject } from "@web/src/server/services/videoArchive";

export async function POST(request: NextRequest) {
  try {
    const body: VideoArchiveRequest = await request.json();

    if (!body.projectId) {
      throw new ApiError(400, {
        error: "Invalid request",
        message: "projectId is required"
      });
    }

    const user = await requireAuthenticatedUser();
    await requireProjectAccess(body.projectId, user.id);

    const archiveResult = await archiveRoomVideosForProject(body.projectId, {
      label: body.label
    });

    return NextResponse.json(
      {
        success: true,
        projectId: body.projectId,
        archivedCount: archiveResult.archivedCount,
        batchId: archiveResult.batchId,
        label: archiveResult.label
      },
      { status: 200 }
    );
  } catch (error) {
    if (error instanceof ApiError) {
      return NextResponse.json(error.body, { status: error.status });
    }

    console.error("[video/archive] Unexpected error", error);
    return NextResponse.json(
      {
        error: "Internal server error",
        message:
          error instanceof Error ? error.message : "Unable to archive videos"
      },
      { status: 500 }
    );
  }
}
