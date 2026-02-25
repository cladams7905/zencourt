/**
 * API Route: Generate social content via content generation action
 *
 * POST /api/v1/content/generate
 */

import { NextRequest } from "next/server";
import { mapDomainError, DomainError } from "@web/src/app/api/v1/_utils";
import { apiErrorResponse, StatusCode } from "@web/src/app/api/v1/_responses";
import {
  createChildLogger,
  logger as baseLogger
} from "@web/src/lib/core/logging/logger";
import { runWithCaller } from "@web/src/server/infra/logger/callContext";
import { readJsonBodySafe } from "@shared/utils";
import { makeSseStreamHeaders } from "@web/src/lib/sse/sseEncoder";
import { generateContentForCurrentUser } from "@web/src/server/actions/content/generate/commands";
import type { PromptAssemblyInput } from "@web/src/lib/ai/prompts/engine/assemble";

const logger = createChildLogger(baseLogger, {
  module: "content-generate-route"
});

const ROUTE_CALLER = "api/v1/content/generate";

export async function POST(request: NextRequest) {
  return runWithCaller(ROUTE_CALLER, async () => {
    try {
      logger.info("Received content generation request");

      const body = (await readJsonBodySafe(
        request
      )) as PromptAssemblyInput | null;

      const result = await generateContentForCurrentUser(body);
      return new Response(result.stream, {
        status: result.status,
        headers: makeSseStreamHeaders()
      });
    } catch (error) {
      if (error instanceof DomainError) {
        const { status, code } = mapDomainError(error);
        return apiErrorResponse(status, code, error.message);
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
  });
}
