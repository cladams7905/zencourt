"use server";

import { requireAuthenticatedUser } from "@web/src/server/actions/_auth/api";
import { requireListingAccess } from "@web/src/server/models/listings/access";
import { getListingVideoStatus as getListingVideoStatusService } from "@web/src/server/services/videoGeneration";
import { getPublicDownloadUrlSafe } from "@web/src/server/services/storage/urlResolution";

export async function getListingVideoStatus(listingId: string) {
  const user = await requireAuthenticatedUser();
  await requireListingAccess(listingId, user.id);
  return getListingVideoStatusService(listingId, getPublicDownloadUrlSafe);
}
