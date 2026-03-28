"use server";

import { withServerActionCaller } from "@web/src/server/infra/logger/callContext";
import { withCurrentUserListingAccess } from "@web/src/server/actions/shared/auth";
import {
  createContent,
  getContentById,
  updateContent
} from "@web/src/server/models/content";
import {
  deleteCachedListingContentItem,
  getCachedListingContentItem
} from "@web/src/server/infra/cache/listingContent/cache";
import { DomainValidationError } from "@web/src/server/errors/domain";
import type { PlayablePreviewTextUpdate } from "@web/src/lib/domain/listings/content/create";
import type { SavedListingReelMetadata } from "@web/src/lib/domain/listings/content/reels";
import { isSavedListingReelMetadata } from "@web/src/lib/domain/listings/content/reels";
import { mapSavedReelContentToCreateItem } from "./mappers";

type NormalizedReelInput = {
  hook: string;
  caption: string;
  sequence: PlayablePreviewTextUpdate["sequence"];
};

function normalizeSequence(
  sequence: PlayablePreviewTextUpdate["sequence"]
): PlayablePreviewTextUpdate["sequence"] {
  return sequence
    .map((item) => ({
      sourceType: item.sourceType,
      sourceId: item.sourceId.trim(),
      durationSeconds: Number(item.durationSeconds.toFixed(2))
    }))
    .filter(
      (item) =>
        Boolean(item.sourceId) &&
        Number.isFinite(item.durationSeconds) &&
        item.durationSeconds > 0
    );
}

function ensureValidSequence(
  sequence: PlayablePreviewTextUpdate["sequence"]
): asserts sequence is PlayablePreviewTextUpdate["sequence"] {
  if (sequence.length === 0) {
    throw new DomainValidationError("At least one reel clip is required.");
  }

  const seen = new Set<string>();
  for (const item of sequence) {
    const key = `${item.sourceType}:${item.sourceId}`;
    if (seen.has(key)) {
      throw new DomainValidationError("Duplicate reel clips are not allowed.");
    }
    seen.add(key);
  }
}

function normalizeReelInput(
  params: PlayablePreviewTextUpdate
): NormalizedReelInput {
  const hook = params.hook.trim();
  const caption = params.caption.trim();
  const sequence = normalizeSequence(params.sequence);

  if (!hook || !caption) {
    throw new DomainValidationError("Hook and caption are required.");
  }

  ensureValidSequence(sequence);

  return {
    hook,
    caption,
    sequence
  };
}

function mapOrThrowSavedReel(row: Awaited<ReturnType<typeof createContent>>) {
  const mapped = mapSavedReelContentToCreateItem(row);
  if (!mapped) {
    throw new DomainValidationError("Saved reel could not be mapped.");
  }
  return mapped;
}

async function saveCachedReelAsContent(params: {
  userId: string;
  listingId: string;
  saveTarget: Extract<
    PlayablePreviewTextUpdate["saveTarget"],
    { contentSource: "cached_create" }
  >;
  normalizedInput: NormalizedReelInput;
}) {
  const { userId, listingId, saveTarget, normalizedInput } = params;
  const cachedItem = await getCachedListingContentItem({
    userId,
    listingId,
    subcategory: saveTarget.subcategory as never,
    mediaType: "video",
    timestamp: saveTarget.cacheKeyTimestamp,
    id: saveTarget.cacheKeyId
  });

  if (!cachedItem) {
    throw new DomainValidationError("Cached reel not found.");
  }

  const metadata: SavedListingReelMetadata = {
    source: "listing_reel",
    version: 1,
    listingSubcategory: saveTarget.subcategory as never,
    hook: normalizedInput.hook,
    caption: normalizedInput.caption,
    brollQuery: cachedItem.broll_query ?? null,
    sequence: normalizedInput.sequence,
    originCacheKeyTimestamp: saveTarget.cacheKeyTimestamp,
    originCacheKeyId: saveTarget.cacheKeyId
  };

  const created = await createContent(userId, {
    listingId,
    contentType: "video",
    contentUrl: null,
    thumbnailUrl: null,
    metadata
  });

  await deleteCachedListingContentItem({
    userId,
    listingId,
    subcategory: saveTarget.subcategory as never,
    mediaType: "video",
    timestamp: saveTarget.cacheKeyTimestamp,
    id: saveTarget.cacheKeyId
  });

  return mapOrThrowSavedReel(created);
}

async function updateSavedReelContent(params: {
  userId: string;
  listingId: string;
  saveTarget: Extract<
    PlayablePreviewTextUpdate["saveTarget"],
    { contentSource: "saved_content" }
  >;
  normalizedInput: NormalizedReelInput;
}) {
  const { userId, listingId, saveTarget, normalizedInput } = params;
  const existing = await getContentById(userId, saveTarget.savedContentId);
  if (!existing || existing.listingId !== listingId) {
    throw new DomainValidationError("Saved reel not found.");
  }
  if (!isSavedListingReelMetadata(existing.metadata)) {
    throw new DomainValidationError("Saved reel metadata is invalid.");
  }

  const metadata: SavedListingReelMetadata = {
    ...existing.metadata,
    hook: normalizedInput.hook,
    caption: normalizedInput.caption,
    sequence: normalizedInput.sequence
  };

  const updated = await updateContent(userId, existing.id, {
    metadata
  });

  return mapOrThrowSavedReel(updated);
}

export const saveListingVideoReel = withServerActionCaller(
  "saveListingVideoReel",
  async (listingId: string, params: PlayablePreviewTextUpdate) =>
    withCurrentUserListingAccess(listingId, async ({ user }) => {
      const normalizedInput = normalizeReelInput(params);

      if (params.saveTarget.contentSource === "cached_create") {
        return saveCachedReelAsContent({
          userId: user.id,
          listingId,
          saveTarget: params.saveTarget,
          normalizedInput
        });
      }

      return updateSavedReelContent({
        userId: user.id,
        listingId,
        saveTarget: params.saveTarget,
        normalizedInput
      });
    })
);
