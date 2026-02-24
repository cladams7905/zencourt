import { NextRequest } from "next/server";
import { ApiError } from "@web/src/app/api/v1/_utils";
import {
  apiErrorCodeFromStatus,
  apiErrorResponse,
  StatusCode
} from "@web/src/app/api/v1/_responses";
import {
  createChildLogger,
  logger as baseLogger
} from "@web/src/lib/core/logging/logger";
import { requireAuthenticatedUser } from "@web/src/server/utils/apiAuth";
import {
  runListingContentGenerate,
  type GenerateListingContentBody
} from "@web/src/server/services/listingContentGeneration";
import { makeSseStreamHeaders } from "@web/src/lib/sse/sseEncoder";
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

    const user = await requireAuthenticatedUser();
    const result = await runListingContentGenerate(
      resolvedParams.listingId,
      user.id,
      body
    );
    return new Response(result.stream, {
      status: result.status,
      headers: makeSseStreamHeaders()
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
    logger.error({ error }, "Failed to generate listing content (pre-stream)");
    return apiErrorResponse(
      StatusCode.INTERNAL_SERVER_ERROR,
      "INTERNAL_ERROR",
      "Failed to generate listing content",
      { message: "Failed to generate listing content" }
    );
  }
}
