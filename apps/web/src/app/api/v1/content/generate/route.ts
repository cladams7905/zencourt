/**
 * API Route: Generate social content via content generation action
 *
 * POST /api/v1/content/generate
 */

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
import { readJsonBodySafe } from "@shared/utils";
import { generateContent } from "@web/src/server/actions/api/content/generate";

const logger = createChildLogger(baseLogger, {
  module: "content-generate-route"
});

export async function POST(request: NextRequest) {
  try {
    logger.info("Received content generation request");

    const body = (await readJsonBodySafe(
      request
    )) as Parameters<typeof generateContent>[0];

    return await generateContent(body);
  } catch (error) {
    if (error instanceof ApiError) {
      return apiErrorResponse(
        error.status,
        apiErrorCodeFromStatus(error.status),
        error.body.message
      );
    }

    const errorDetails =
      error instanceof Error
        ? { message: error.message, stack: error.stack }
        : { error };

    logger.error(errorDetails, "Unhandled error generating content");
    return apiErrorResponse(
      StatusCode.INTERNAL_SERVER_ERROR,
      "INTERNAL_ERROR",
      "Failed to generate content"
    );
  }
}
