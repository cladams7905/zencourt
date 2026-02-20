import { NextRequest, NextResponse } from "next/server";
import {
  ApiError,
  requireAuthenticatedUser,
  requireListingAccess
} from "../../../_utils";
import { getListingVideoStatus } from "@web/src/server/services/videoStatus";
import { createChildLogger } from "@shared/utils";
import { logger as baseLogger } from "@web/src/lib/core/logging/logger";
import { apiErrorResponse } from "@web/src/app/api/v1/_responses";
import { requireNonEmptyParam } from "@web/src/app/api/v1/_validation";

export const runtime = "nodejs";

const logger = createChildLogger(baseLogger, {
  module: "video-status-route"
});

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ listingId: string }> }
) {
  try {
    const listingId = requireNonEmptyParam((await params).listingId);
    if (!listingId) {
      return apiErrorResponse(
        400,
        "INVALID_REQUEST",
        "listingId path parameter is required",
        { message: "listingId path parameter is required" }
      );
    }

    const user = await requireAuthenticatedUser();
    await requireListingAccess(listingId, user.id);

    const payload = await getListingVideoStatus(listingId);
    return NextResponse.json({
      success: true,
      data: payload
    });
  } catch (error) {
    if (error instanceof ApiError) {
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
        { message: error.body.message }
      );
    }

    logger.error(error, "Failed to load video status");
    return apiErrorResponse(
      500,
      "VIDEO_STATUS_ERROR",
      error instanceof Error ? error.message : "Failed to load video status",
      {
        message:
          error instanceof Error
            ? error.message
            : "Failed to load video status"
      }
    );
  }
}
