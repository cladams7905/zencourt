import { NextRequest } from "next/server";
import { ApiError } from "@web/src/server/utils/apiError";
import {
  apiErrorCodeFromStatus,
  apiErrorResponse,
  StatusCode
} from "@web/src/app/api/v1/_responses";
import {
  createChildLogger,
  logger as baseLogger
} from "@web/src/lib/core/logging/logger";
import type { GenerateListingContentBody } from "@web/src/server/services/listingContentGeneration";
import { generateListingContent } from "@web/src/server/actions/api/listings/content";
import { readJsonBodySafe } from "@shared/utils/api/validation";

const logger = createChildLogger(baseLogger, {
  module: "listing-content-generate-route"
});

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ listingId: string }> }
) {
  try {
    const resolvedParams = await params;
    const body = (await readJsonBodySafe(
      request
    )) as GenerateListingContentBody | null;

    return await generateListingContent(resolvedParams.listingId, body);
  } catch (error) {
    if (error instanceof ApiError) {
      return apiErrorResponse(
        error.status,
        apiErrorCodeFromStatus(error.status),
        error.body.message,
        { message: error.body.message }
      );
    }
    logger.error({ error }, "Failed to generate listing content (pre-stream)");
    return apiErrorResponse(
      StatusCode.INTERNAL_SERVER_ERROR,
      "INTERNAL_ERROR",
      "Failed to generate listing content",
      { message: "Failed to generate listing content" }
    );
  }
}
