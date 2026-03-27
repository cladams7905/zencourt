"use server";

import { withServerActionCaller } from "@web/src/server/infra/logger/callContext";
import { withCurrentUserListingAccess } from "@web/src/server/actions/shared/auth";
import { getListingClipDownload, getListingClipVersionItems } from "./queries";

export const getListingClipVersionItemsForCurrentUser = withServerActionCaller(
  "getListingClipVersionItemsForCurrentUser",
  async (listingId: string) =>
    withCurrentUserListingAccess(listingId, async () =>
      getListingClipVersionItems(listingId)
    )
);

export const getListingClipDownloadForCurrentUser = withServerActionCaller(
  "getListingClipDownloadForCurrentUser",
  async (listingId: string, clipVersionId: string) =>
    withCurrentUserListingAccess(listingId, async () =>
      getListingClipDownload(listingId, clipVersionId)
    )
);
