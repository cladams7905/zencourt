import { NextRequest, NextResponse } from "next/server";
import {
  ApiError,
  requireAuthenticatedUser,
  requireListingAccess
} from "@web/src/app/api/v1/_utils";
import { getVideoServerConfig } from "@web/src/app/api/v1/video/_config";
import {
  apiErrorCodeFromStatus,
  apiErrorResponse
} from "@web/src/app/api/v1/_responses";
import { StatusCode } from "@web/src/app/api/v1/_statusCodes";
import {
  readJsonBodySafe,
  requireNonEmptyParam
} from "@web/src/app/api/v1/_validation";
import {
  createChildLogger,
  logger as baseLogger
} from "@web/src/lib/core/logging/logger";

const logger = createChildLogger(baseLogger, {
  module: "generation-cancel-route"
});

async function extractReason(request: NextRequest): Promise<string | undefined> {
  const contentType = request.headers.get("content-type") || "";
  if (!contentType.includes("application/json")) {
    return undefined;
  }

  const body = await readJsonBodySafe(request);
  if (body && typeof body.reason === "string") {
    return body.reason;
  }

  return undefined;
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ listingId: string }> }
) {
  const listingId = requireNonEmptyParam((await params).listingId);

  if (!listingId) {
      return apiErrorResponse(
      StatusCode.BAD_REQUEST,
      "INVALID_REQUEST",
      "listingId is required"
    );
  }

  try {
    const user = await requireAuthenticatedUser();
    await requireListingAccess(listingId, user.id);

    const reason = await extractReason(request);
    const { baseUrl, apiKey } = getVideoServerConfig();

    const response = await fetch(`${baseUrl}/video/cancel`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-API-Key": apiKey
      },
      body: JSON.stringify({
        listingId,
        reason: reason || "Canceled via workflow"
      })
    });

    const payload = await response.json().catch(() => ({}));

    if (!response.ok) {
      const message =
        payload?.error || payload?.message || "Failed to cancel generation";
      return apiErrorResponse(
        response.status,
        "VIDEO_SERVER_ERROR",
        "Video server cancel error",
        { message }
      );
    }

    logger.info(
      {
        listingId,
        canceledVideos: payload?.canceledVideos,
        canceledJobs: payload?.canceledJobs
      },
      "Canceled generation via video server"
    );

    return NextResponse.json({
      success: true,
      listingId,
      canceledVideos: payload?.canceledVideos ?? 0,
      canceledJobs: payload?.canceledJobs ?? 0
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
    logger.error(
      { err: error instanceof Error ? error.message : String(error) },
      "Unexpected error canceling generation"
    );
    return apiErrorResponse(
      StatusCode.INTERNAL_SERVER_ERROR,
      "INTERNAL_ERROR",
      "Unable to cancel generation",
      { message: "Unable to cancel generation" }
    );
  }
}
