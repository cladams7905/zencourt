"use server";

import { withServerActionCaller } from "@web/src/server/infra/logger/callContext";
import type {
  ClipVersionRegenerateRequest,
  VideoGenerateRequest
} from "@shared/types/api";
import { DomainValidationError } from "@web/src/server/errors/domain";
import { withCurrentUserListingAccess } from "@web/src/server/actions/shared/auth";
import {
  getVideoClipById,
  getVideoClipVersionById,
  getVideoGenBatchById,
  updateVideoClip
} from "@web/src/server/models/video";
import {
  cancelVideoGenerationBatch as cancelVideoGenerationBatchHelper,
  regenerateListingClipVersion as regenerateListingClipVersionHelper,
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

function parseClipVersionRegenerateRequest(
  body: unknown
): ClipVersionRegenerateRequest {
  const input = (body || {}) as Partial<ClipVersionRegenerateRequest>;
  if (!input.listingId || typeof input.listingId !== "string") {
    throw new DomainValidationError("listingId is required");
  }
  if (!input.clipId || typeof input.clipId !== "string") {
    throw new DomainValidationError("clipId is required");
  }

  return {
    listingId: input.listingId.trim(),
    clipId: input.clipId.trim(),
    aiDirections:
      typeof input.aiDirections === "string" ? input.aiDirections : undefined
  };
}

function parseSelectCurrentClipVersionRequest(body: unknown): {
  listingId: string;
  clipId: string;
  clipVersionId: string;
} {
  const input = (body || {}) as Partial<{
    listingId: string;
    clipId: string;
    clipVersionId: string;
  }>;

  if (!input.listingId || typeof input.listingId !== "string") {
    throw new DomainValidationError("listingId is required");
  }
  if (!input.clipId || typeof input.clipId !== "string") {
    throw new DomainValidationError("clipId is required");
  }
  if (!input.clipVersionId || typeof input.clipVersionId !== "string") {
    throw new DomainValidationError("clipVersionId is required");
  }

  return {
    listingId: input.listingId.trim(),
    clipId: input.clipId.trim(),
    clipVersionId: input.clipVersionId.trim()
  };
}

export const startListingVideoGeneration = withServerActionCaller(
  "startListingVideoGeneration",
  async (body: unknown) => {
    const parsed = parseVideoGenerateRequest(body);
    return withCurrentUserListingAccess(
      parsed.listingId,
      async ({ user, listing }) => {
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
  }
);

export const cancelVideoGenerationBatch = withServerActionCaller(
  "cancelVideoGenerationBatch",
  async (batchId: string, reason?: string) =>
    withCurrentUserListingAccess(
      async () => {
        const batch = await getVideoGenBatchById(batchId);
        if (!batch) {
          throw new DomainValidationError("batchId is invalid");
        }
        return batch.listingId;
      },
      async () =>
        cancelVideoGenerationBatchHelper({
          batchId,
          reason
        })
    )
);

export const regenerateListingClipVersion = withServerActionCaller(
  "regenerateListingClipVersion",
  async (body: unknown) => {
    const parsed = parseClipVersionRegenerateRequest(body);
    return withCurrentUserListingAccess(
      parsed.listingId,
      async ({ user, listing }) => {
        const result = await regenerateListingClipVersionHelper({
          listingId: listing.id,
          userId: user.id,
          clipId: parsed.clipId,
          aiDirections: parsed.aiDirections,
          resolvePublicDownloadUrls: getPublicDownloadUrls
        });

        return { ...result, listingId: listing.id };
      }
    );
  }
);

export const selectListingClipVersion = withServerActionCaller(
  "selectListingClipVersion",
  async (body: unknown) => {
    const parsed = parseSelectCurrentClipVersionRequest(body);
    return withCurrentUserListingAccess(
      parsed.listingId,
      async ({ listing }) => {
        const clip = await getVideoClipById(parsed.clipId);

        if (!clip || clip.listingId !== listing.id) {
          throw new DomainValidationError("clipId is invalid");
        }

        const clipVersion = await getVideoClipVersionById(parsed.clipVersionId);
        if (!clipVersion || clipVersion.videoClipId !== clip.id) {
          throw new DomainValidationError("clipVersionId is invalid");
        }

        await updateVideoClip(clip.id, {
          currentVideoClipVersionId: clipVersion.id
        });

        return {
          listingId: listing.id,
          clipId: clip.id,
          clipVersionId: clipVersion.id
        };
      }
    );
  }
);
