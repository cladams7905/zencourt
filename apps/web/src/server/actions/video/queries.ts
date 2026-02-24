"use server";

import { requireAuthenticatedUser } from "@web/src/server/auth/apiAuth";
import { requireListingAccess } from "@web/src/server/models/listings/access";
import { getListingVideoStatus as getListingVideoStatusService } from "@web/src/server/services/videoGeneration";

export async function getListingVideoStatus(listingId: string) {
  const user = await requireAuthenticatedUser();
  await requireListingAccess(listingId, user.id);
  return getListingVideoStatusService(listingId);
}
