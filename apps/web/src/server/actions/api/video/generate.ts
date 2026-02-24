"use server";

import type { VideoGenerateRequest } from "@shared/types/api";
import { ApiError } from "@web/src/server/utils/apiError";
import { StatusCode } from "@web/src/server/utils/apiResponses";
import { requireAuthenticatedUser } from "@web/src/server/utils/apiAuth";
import { requireListingAccess } from "@web/src/server/utils/listingAccess";
import {
  startListingVideoGeneration as startListingVideoGenerationService
} from "@web/src/server/services/videoGeneration";

function parseVideoGenerateRequest(body: unknown): VideoGenerateRequest {
  const input = (body || {}) as Partial<VideoGenerateRequest>;
  if (!input.listingId || typeof input.listingId !== "string") {
    throw new ApiError(StatusCode.BAD_REQUEST, {
      error: "Invalid request",
      message: "listingId is required"
    });
  }
  return {
    listingId: input.listingId.trim(),
    orientation: input.orientation,
    aiDirections:
      typeof input.aiDirections === "string" ? input.aiDirections : undefined
  };
}

/**
 * Single entry point for "start video generation" for a listing.
 * Used by POST /api/v1/video/generate and any component that starts generation.
 */
export async function startListingVideoGeneration(body: unknown) {
  const user = await requireAuthenticatedUser();
  const parsed = parseVideoGenerateRequest(body);
  const listing = await requireListingAccess(parsed.listingId, user.id);
  const result = await startListingVideoGenerationService({
    listingId: listing.id,
    userId: user.id,
    orientation: parsed.orientation,
    aiDirections: parsed.aiDirections
  });
  return { ...result, listingId: listing.id };
}
