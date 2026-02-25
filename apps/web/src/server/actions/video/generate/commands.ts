"use server";

import { withServerActionCaller } from "@web/src/server/infra/logger/callContext";
import type { VideoGenerateRequest } from "@shared/types/api";
import { DomainValidationError } from "@web/src/server/errors/domain";
import { requireAuthenticatedUser } from "@web/src/server/actions/_auth/api";
import { requireListingAccess } from "@web/src/server/models/listings/access";
import {
  cancelListingVideoGeneration as cancelListingVideoGenerationHelper,
  startListingVideoGeneration as startListingVideoGenerationHelper
} from "./helpers";
import { getPublicDownloadUrls } from "@web/src/server/services/storage/urlResolution";

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

export const startListingVideoGeneration = withServerActionCaller(
  "startListingVideoGeneration",
  async (body: unknown) => {
    const user = await requireAuthenticatedUser();
    const parsed = parseVideoGenerateRequest(body);
    const listing = await requireListingAccess(parsed.listingId, user.id);
    const result = await startListingVideoGenerationHelper({
      listingId: listing.id,
      userId: user.id,
      orientation: parsed.orientation,
      aiDirections: parsed.aiDirections,
      resolvePublicDownloadUrls: getPublicDownloadUrls
    });
    return { ...result, listingId: listing.id };
  }
);

export const cancelListingVideoGeneration = withServerActionCaller(
  "cancelListingVideoGeneration",
  async (listingId: string, reason?: string) => {
    const user = await requireAuthenticatedUser();
    await requireListingAccess(listingId, user.id);
    return cancelListingVideoGenerationHelper({
      listingId,
      reason
    });
  }
);
