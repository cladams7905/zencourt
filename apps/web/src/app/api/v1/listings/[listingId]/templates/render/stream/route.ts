import { NextRequest } from "next/server";
import { ApiError, DomainError, mapDomainError } from "@web/src/app/api/v1/_utils";
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
import { renderListingTemplateBatchStream } from "@web/src/server/actions/listings/templateRender";
import { makeSseStreamHeaders } from "@web/src/lib/sse/sseEncoder";
import { readJsonBodySafe } from "@shared/utils/api/validation";

const logger = createChildLogger(baseLogger, {
  module: "listing-template-render-stream-route"
});

export async function POST(
  request: NextRequest,
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
        "Listing ID is required",
        { message: "Listing ID is required" }
      );
    }

    const body = (await readJsonBodySafe(request)) as {
      subcategory?: string;
      captionItems?: unknown;
      templateCount?: number;
      templateId?: string;
    } | null;

    const result = await renderListingTemplateBatchStream(
      listingId,
      body,
      request.nextUrl.origin
    );
    return new Response(result.stream, { headers: makeSseStreamHeaders() });
  } catch (error) {
    if (error instanceof DomainError) {
      const { status, code } = mapDomainError(error);
      return apiErrorResponse(status, code, error.message, {
        message: error.message
      });
    }
    if (error instanceof ApiError) {
      return apiErrorResponse(
        error.status,
        apiErrorCodeFromStatus(error.status),
        error.body.message,
        { message: error.body.message }
      );
    }
    logger.error({ error }, "Template render stream setup failed");
    return apiErrorResponse(
      StatusCode.INTERNAL_SERVER_ERROR,
      "INTERNAL_ERROR",
      "Failed to start template render stream",
      { message: "Failed to start template render stream" }
    );
  }
}
