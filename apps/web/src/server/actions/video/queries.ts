"use server";

import { requireAuthenticatedUser } from "@web/src/server/utils/apiAuth";
import { requireListingAccess } from "@web/src/server/utils/listingAccess";
import { getListingVideoStatus as getListingVideoStatusService } from "@web/src/server/services/videoGeneration";

export async function getListingVideoStatus(listingId: string) {
  const user = await requireAuthenticatedUser();
  await requireListingAccess(listingId, user.id);
  return getListingVideoStatusService(listingId);
}
