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
import { readJsonBodySafe } from "@shared/utils/api/validation";
import { cancelListingVideoGeneration } from "@web/src/server/actions/api/video";

const logger = createChildLogger(baseLogger, {
  module: "generation-cancel-route"
});

async function extractReason(
  request: NextRequest
): Promise<string | undefined> {
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
  let listingId: string;
  try {
    listingId = parseRequiredRouteParam((await params).listingId, "listingId");
  } catch {
    return apiErrorResponse(
      StatusCode.BAD_REQUEST,
      "INVALID_REQUEST",
      "listingId is required"
    );
  }

  try {
    const reason = await extractReason(request);
    const result = await cancelListingVideoGeneration(listingId, reason);

    return NextResponse.json(result);
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
