import { NextRequest, NextResponse } from "next/server";
import { ApiError } from "@web/src/app/api/v1/_utils";
import {
  apiErrorCodeFromStatus,
  apiErrorResponse,
  StatusCode
} from "@web/src/app/api/v1/_responses";
import { parseRequiredRouteParam } from "@shared/utils/api/parsers";
import {
  createChildLogger,
  logger as baseLogger
} from "@web/src/lib/core/logging/logger";
import { getListingVideoStatus } from "@web/src/server/actions/video/generate";

export const runtime = "nodejs";

const logger = createChildLogger(baseLogger, {
  module: "video-status-route"
});

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ listingId: string }> }
) {
  try {
    let listingId: string;
    try {
      listingId = parseRequiredRouteParam(
        (await params).listingId,
        "listingId"
      );
    } catch {
      return apiErrorResponse(
        StatusCode.BAD_REQUEST,
        "INVALID_REQUEST",
        "listingId path parameter is required",
        { message: "listingId path parameter is required" }
      );
    }

    const payload = await getListingVideoStatus(listingId);
    return NextResponse.json({
      success: true,
      data: payload
    });
  } catch (error) {
    if (error instanceof ApiError) {
      return apiErrorResponse(
        error.status,
        apiErrorCodeFromStatus(error.status),
        error.body.message,
        { message: error.body.message }
      );
    }

    logger.error(error, "Failed to load video status");
    return apiErrorResponse(
      StatusCode.INTERNAL_SERVER_ERROR,
      "VIDEO_STATUS_ERROR",
      error instanceof Error ? error.message : "Failed to load video status",
      {
        message:
          error instanceof Error ? error.message : "Failed to load video status"
      }
    );
  }
}
