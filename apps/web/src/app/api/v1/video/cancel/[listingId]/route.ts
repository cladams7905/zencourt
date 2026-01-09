import { NextRequest, NextResponse } from "next/server";
import {
  ApiError,
  requireAuthenticatedUser,
  requireListingAccess
} from "@web/src/app/api/v1/_utils";
import { getVideoServerConfig } from "@web/src/app/api/v1/video/_config";
import {
  createChildLogger,
  logger as baseLogger
} from "@web/src/lib/logger";

const logger = createChildLogger(baseLogger, {
  module: "generation-cancel-route"
});

async function extractReason(request: NextRequest): Promise<string | undefined> {
  const contentType = request.headers.get("content-type") || "";
  if (!contentType.includes("application/json")) {
    return undefined;
  }

  try {
    const body = await request.json();
    if (body && typeof body.reason === "string") {
      return body.reason;
    }
  } catch {
    // Ignore JSON parse errors; reason is optional
  }

  return undefined;
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ listingId: string }> }
) {
  const { listingId } = await params;

  if (!listingId) {
    return NextResponse.json(
      {
        error: "Invalid request",
        message: "listingId is required"
      },
      { status: 400 }
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

      throw new ApiError(response.status, {
        error: "Video server cancel error",
        message
      });
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
    logger.error(
      {
        listingId,
        error: error instanceof Error ? error.message : String(error)
      },
      "Failed to cancel generation"
    );

    if (error instanceof ApiError) {
      return NextResponse.json(error.body, { status: error.status });
    }

    return NextResponse.json(
      {
        error: "Internal server error",
        message:
          error instanceof Error ? error.message : "Unable to cancel generation"
      },
      { status: 500 }
    );
  }
}
