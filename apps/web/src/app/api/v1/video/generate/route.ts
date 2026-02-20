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
  apiErrorCodeFromStatus,
  apiErrorResponse,
  StatusCode
} from "@web/src/app/api/v1/_responses";
import {
  createChildLogger,
  logger as baseLogger
} from "@web/src/lib/core/logging/logger";
import { startListingVideoGeneration } from "@web/src/server/services/videoGeneration";
import { readJsonBodySafe } from "@shared/utils/api/validation";

const logger = createChildLogger(baseLogger, {
  module: "video-generate-route"
});

function parseVideoGenerateRequest(body: unknown): VideoGenerateRequest {
  const input = (body || {}) as Partial<VideoGenerateRequest>;
  if (!input.listingId || typeof input.listingId !== "string") {
    throw new Error("listingId is required");
  }

  return {
    listingId: input.listingId.trim(),
    orientation: input.orientation,
    aiDirections:
      typeof input.aiDirections === "string" ? input.aiDirections : undefined
  };
}

export async function POST(
  request: NextRequest
): Promise<NextResponse<VideoGenerateResponse>> {
  try {
    const rawBody = await readJsonBodySafe(request);
    let body: VideoGenerateRequest;
    try {
      body = parseVideoGenerateRequest(rawBody);
    } catch {
      return apiErrorResponse(
        StatusCode.BAD_REQUEST,
        "INVALID_REQUEST",
        "listingId is required",
        {
          listingId: "",
          videoId: "",
          jobIds: [],
          jobCount: 0
        }
      ) as NextResponse<VideoGenerateResponse>;
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
      { status: StatusCode.ACCEPTED }
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
        apiErrorCodeFromStatus(error.status),
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
      return apiErrorResponse(
        StatusCode.INTERNAL_SERVER_ERROR,
        "DATABASE_ERROR",
        error.message,
        {
          listingId: "",
          videoId: "",
          jobIds: [],
          jobCount: 0
        }
      ) as NextResponse<VideoGenerateResponse>;
    }

    return apiErrorResponse(
      StatusCode.INTERNAL_SERVER_ERROR,
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
