"use server";

import type { NextResponse } from "next/server";
import type { PromptAssemblyInput } from "@web/src/lib/ai/prompts/engine/assemble";
import { ApiError } from "@web/src/server/utils/apiError";
import { StatusCode } from "@web/src/server/utils/apiResponses";
import { requireAuthenticatedUser } from "@web/src/server/utils/apiAuth";
import { runContentGeneration } from "@web/src/server/services/contentGeneration";

/**
 * Single entry point for "generate content" (global, not listing-scoped).
 * Used by POST /api/v1/content/generate.
 */
export async function generateContent(
  body: PromptAssemblyInput | null
): Promise<NextResponse> {
  const user = await requireAuthenticatedUser();
  if (!body?.category) {
    throw new ApiError(StatusCode.BAD_REQUEST, {
      error: "Invalid request",
      message: "category is required"
    });
  }
  if (!body.agent_profile) {
    throw new ApiError(StatusCode.BAD_REQUEST, {
      error: "Invalid request",
      message: "agent_profile is required"
    });
  }
  return runContentGeneration(user.id, body);
}
