/**
 * API Route: Generate social content via content generation action
 *
 * POST /api/v1/content/generate
 */

import { NextRequest } from "next/server";
import {
  mapDomainError,
  DomainError
} from "@web/src/app/api/v1/_utils";
import {
  apiErrorResponse,
  StatusCode
} from "@web/src/app/api/v1/_responses";
import {
  createChildLogger,
  logger as baseLogger
} from "@web/src/lib/core/logging/logger";
import { readJsonBodySafe } from "@shared/utils";
import { makeSseStreamHeaders } from "@web/src/lib/sse/sseEncoder";
import { requireAuthenticatedUser } from "@web/src/server/utils/apiAuth";
import { runContentGeneration } from "@web/src/server/services/contentGeneration";
import type { PromptAssemblyInput } from "@web/src/lib/ai/prompts/engine/assemble";
import { DomainValidationError } from "@web/src/server/errors/domain";

const logger = createChildLogger(baseLogger, {
  module: "content-generate-route"
});

export async function POST(request: NextRequest) {
  try {
    logger.info("Received content generation request");

    const body = (await readJsonBodySafe(
      request
    )) as PromptAssemblyInput | null;

    if (!body?.category) {
      throw new DomainValidationError("category is required");
    }
    if (!body.agent_profile) {
      throw new DomainValidationError("agent_profile is required");
    }

    const user = await requireAuthenticatedUser();
    const result = await runContentGeneration(user.id, body);
    return new Response(result.stream, {
      status: result.status,
      headers: makeSseStreamHeaders()
    });
  } catch (error) {
    if (error instanceof DomainError) {
      const { status, code } = mapDomainError(error);
      return apiErrorResponse(
        status,
        code,
        error.message
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
