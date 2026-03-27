"use server";

import { withServerActionCaller } from "@web/src/server/infra/logger/callContext";
import { requireAuthenticatedUser } from "@web/src/server/actions/_auth/api";
import { requireListingAccess } from "@web/src/server/models/listings/access";
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
import type { PlayablePreviewTextUpdate } from "@web/src/lib/domain/listings/create";
import type { SavedListingReelMetadata } from "@web/src/lib/domain/listings/reels";
import { isSavedListingReelMetadata } from "@web/src/lib/domain/listings/reels";
import { mapSavedReelContentToCreateItem } from "./mappers";

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

export const saveListingVideoReel = withServerActionCaller(
  "saveListingVideoReel",
  async (listingId: string, params: PlayablePreviewTextUpdate) => {
    const user = await requireAuthenticatedUser();
    await requireListingAccess(listingId, user.id);

    const hook = params.hook.trim();
    const caption = params.caption.trim();
    const sequence = normalizeSequence(params.sequence);

    if (!hook || !caption) {
      throw new DomainValidationError("Hook and caption are required.");
    }

    ensureValidSequence(sequence);

    if (params.saveTarget.contentSource === "cached_create") {
      const cachedItem = await getCachedListingContentItem({
        userId: user.id,
        listingId,
        subcategory: params.saveTarget.subcategory as never,
        mediaType: "video",
        timestamp: params.saveTarget.cacheKeyTimestamp,
        id: params.saveTarget.cacheKeyId
      });

      if (!cachedItem) {
        throw new DomainValidationError("Cached reel not found.");
      }

      const metadata: SavedListingReelMetadata = {
        source: "listing_reel",
        version: 1,
        listingSubcategory: params.saveTarget.subcategory as never,
        hook,
        caption,
        body: cachedItem.body ?? null,
        brollQuery: cachedItem.broll_query ?? null,
        sequence,
        originCacheKeyTimestamp: params.saveTarget.cacheKeyTimestamp,
        originCacheKeyId: params.saveTarget.cacheKeyId
      };

      const created = await createContent(user.id, {
        listingId,
        contentType: "video",
        contentUrl: null,
        thumbnailUrl: null,
        metadata
      });

      await deleteCachedListingContentItem({
        userId: user.id,
        listingId,
        subcategory: params.saveTarget.subcategory as never,
        mediaType: "video",
        timestamp: params.saveTarget.cacheKeyTimestamp,
        id: params.saveTarget.cacheKeyId
      });

      const mapped = mapSavedReelContentToCreateItem(created);
      if (!mapped) {
        throw new DomainValidationError("Saved reel could not be mapped.");
      }

      return mapped;
    }

    const existing = await getContentById(
      user.id,
      params.saveTarget.savedContentId
    );
    if (!existing || existing.listingId !== listingId) {
      throw new DomainValidationError("Saved reel not found.");
    }
    if (!isSavedListingReelMetadata(existing.metadata)) {
      throw new DomainValidationError("Saved reel metadata is invalid.");
    }

    const metadata: SavedListingReelMetadata = {
      ...existing.metadata,
      hook,
      caption,
      sequence
    };

    const updated = await updateContent(user.id, existing.id, {
      metadata
    });

    const mapped = mapSavedReelContentToCreateItem(updated);
    if (!mapped) {
      throw new DomainValidationError("Saved reel could not be mapped.");
    }

    return mapped;
  }
);
