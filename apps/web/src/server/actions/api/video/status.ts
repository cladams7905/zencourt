"use server";

import { requireAuthenticatedUser } from "@web/src/server/utils/apiAuth";
import { requireListingAccess } from "@web/src/server/utils/listingAccess";
import { getListingVideoStatus as getListingVideoStatusService } from "@web/src/server/services/videoGeneration";

/**
 * Single entry point for "get video status" for a listing.
 * Used by GET /api/v1/video/status/[listingId] and any component that needs status.
 */
export async function getListingVideoStatus(listingId: string) {
  const user = await requireAuthenticatedUser();
  await requireListingAccess(listingId, user.id);
  return getListingVideoStatusService(listingId);
}
