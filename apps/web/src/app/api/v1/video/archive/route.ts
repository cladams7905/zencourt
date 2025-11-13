import { NextRequest, NextResponse } from "next/server";
import type { VideoArchiveRequest } from "@shared/types/api";
import {
  ApiError,
  requireAuthenticatedUser,
  requireProjectAccess
} from "../../_utils";
import { archiveRoomVideosForProject } from "@web/src/server/services/videoArchive";
import {
  createChildLogger,
  logger as baseLogger
} from "../../../../../lib/logger";

const logger = createChildLogger(baseLogger, {
  module: "video-archive-route"
});

export async function POST(request: NextRequest) {
  try {
    const body: VideoArchiveRequest = await request.json();

    if (!body.projectId) {
      logger.warn("Video archive request missing projectId");
      throw new ApiError(400, {
        error: "Invalid request",
        message: "projectId is required"
      });
    }

    const user = await requireAuthenticatedUser();
    await requireProjectAccess(body.projectId, user.id);

    logger.info(
      {
        userId: user.id,
        projectId: body.projectId,
        label: body.label
      },
      "Archiving project room videos"
    );

    const archiveResult = await archiveRoomVideosForProject(body.projectId, {
      label: body.label
    });

    logger.info(
      {
        projectId: body.projectId,
        archivedCount: archiveResult.archivedCount,
        batchId: archiveResult.batchId
      },
      "Successfully archived room videos"
    );

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
      logger.warn(
        {
          status: error.status,
          body: error.body
        },
        "Video archive request failed with ApiError"
      );
      return NextResponse.json(error.body, { status: error.status });
    }

    logger.error(
      { err: error },
      "Video archive request failed with unexpected error"
    );
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
