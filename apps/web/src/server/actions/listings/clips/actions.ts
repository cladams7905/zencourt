"use server";

import { withServerActionCaller } from "@web/src/server/infra/logger/callContext";
import { requireAuthenticatedUser } from "@web/src/server/actions/_auth/api";
import { requireListingAccess } from "@web/src/server/models/listings/access";
import {
  getListingClipDownload,
  getListingClipVersionItems
} from "./queries";

export const getListingClipVersionItemsForCurrentUser = withServerActionCaller(
  "getListingClipVersionItemsForCurrentUser",
  async (listingId: string) => {
    const user = await requireAuthenticatedUser();
    await requireListingAccess(listingId, user.id);
    return getListingClipVersionItems(listingId);
  }
);

export const getListingClipDownloadForCurrentUser = withServerActionCaller(
  "getListingClipDownloadForCurrentUser",
  async (listingId: string, clipVersionId: string) => {
    const user = await requireAuthenticatedUser();
    await requireListingAccess(listingId, user.id);
    return getListingClipDownload(listingId, clipVersionId);
  }
);
