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
import { apiErrorResponse } from "@web/src/app/api/v1/_responses";
import { readJsonBodySafe } from "@web/src/app/api/v1/_validation";
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
    const body = (await readJsonBodySafe(request)) as VideoGenerateRequest | null;
    if (!body?.listingId) {
      return apiErrorResponse(400, "INVALID_REQUEST", "listingId is required", {
        listingId: "",
        videoId: "",
        jobIds: [],
        jobCount: 0
      }) as NextResponse<VideoGenerateResponse>;
    }
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
      return apiErrorResponse(
        error.status,
        error.status === 401
          ? "UNAUTHORIZED"
          : error.status === 403
            ? "FORBIDDEN"
            : error.status === 404
              ? "NOT_FOUND"
              : "INVALID_REQUEST",
        error.body.message,
        {
          listingId: "",
          videoId: "",
          jobIds: [],
          jobCount: 0
        }
      ) as NextResponse<VideoGenerateResponse>;
    }

    if (error instanceof DrizzleQueryError) {
      logger.error(
        { err: error.message },
        "Video generation request failed with DrizzleQueryError"
      );
      return apiErrorResponse(500, "DATABASE_ERROR", error.message, {
        listingId: "",
        videoId: "",
        jobIds: [],
        jobCount: 0
      }) as NextResponse<VideoGenerateResponse>;
    }

    return apiErrorResponse(
      500,
      "INTERNAL_ERROR",
      error instanceof Error ? error.message : "Unable to start generation",
      {
        message:
          error instanceof Error ? error.message : "Unable to start generation",
        listingId: "",
        videoId: "",
        jobIds: [],
        jobCount: 0
      }
    ) as NextResponse<VideoGenerateResponse>;
  }
}
