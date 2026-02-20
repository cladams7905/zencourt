/**
 * API Route: Start video generation via server-side videoGeneration service
 *
 * POST /api/v1/video/generate
 */

import { NextRequest, NextResponse } from "next/server";
import { DrizzleQueryError } from "drizzle-orm";
import {
  ApiError,
  requireAuthenticatedUser,
  requireListingAccess
} from "../../_utils";
import { VideoGenerateRequest, VideoGenerateResponse } from "@shared/types/api";
import {
  createChildLogger,
  logger as baseLogger
} from "@web/src/lib/core/logging/logger";
import { startListingVideoGeneration } from "@web/src/server/services/videoGeneration";

const logger = createChildLogger(baseLogger, {
  module: "video-generate-route"
});

export async function POST(
  request: NextRequest
): Promise<NextResponse<VideoGenerateResponse>> {
  try {
    const body: VideoGenerateRequest = await request.json();
    const user = await requireAuthenticatedUser();
    const listing = await requireListingAccess(body.listingId, user.id);

    const result = await startListingVideoGeneration({
      listingId: listing.id,
      userId: user.id,
      orientation: body.orientation,
      aiDirections: body.aiDirections
    });

    return NextResponse.json(
      {
        success: true,
        message: "Video generation started",
        listingId: listing.id,
        videoId: result.videoId,
        jobIds: result.jobIds,
        jobCount: result.jobCount
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
    }

    if (error instanceof DrizzleQueryError) {
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
