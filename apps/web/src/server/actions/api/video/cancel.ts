"use server";

import { requireAuthenticatedUser } from "@web/src/server/utils/apiAuth";
import {
  cancelListingVideoGeneration as cancelListingVideoGenerationService
} from "@web/src/server/services/videoGeneration";

/**
 * Single entry point for "cancel video generation" for a listing.
 * Used by POST /api/v1/video/cancel/[listingId] and any component that cancels.
 * Listing access is enforced inside the service.
 */
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
