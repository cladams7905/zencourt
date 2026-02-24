"use server";

import type { VideoGenerateRequest } from "@shared/types/api";
import {
  DomainValidationError
} from "@web/src/server/errors/domain";
import { requireAuthenticatedUser } from "@web/src/server/auth/apiAuth";
import { requireListingAccess } from "@web/src/server/models/listings/access";
import {
  cancelListingVideoGeneration as cancelListingVideoGenerationService,
  startListingVideoGeneration as startListingVideoGenerationService
} from "@web/src/server/services/videoGeneration";

function parseVideoGenerateRequest(body: unknown): VideoGenerateRequest {
  const input = (body || {}) as Partial<VideoGenerateRequest>;
  if (!input.listingId || typeof input.listingId !== "string") {
    throw new DomainValidationError("listingId is required");
  }
  return {
    listingId: input.listingId.trim(),
    orientation: input.orientation,
    aiDirections:
      typeof input.aiDirections === "string" ? input.aiDirections : undefined
  };
}

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

export async function cancelListingVideoGeneration(
  listingId: string,
  reason?: string
) {
  const user = await requireAuthenticatedUser();
  return cancelListingVideoGenerationService({
    listingId,
    userId: user.id,
    reason
  });
}
