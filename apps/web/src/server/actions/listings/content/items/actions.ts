"use server";

import { withServerActionCaller } from "@web/src/server/infra/logger/callContext";
import { withCurrentUserListingAccess } from "@web/src/server/actions/shared/auth";
import type { ListingCreateMediaTab } from "@web/src/lib/domain/listings/content/create";
import type { ListingContentSubcategory } from "@shared/types/models";
import { getListingContentItems } from "./queries";

export const getListingContentItemsForCurrentUser = withServerActionCaller(
  "getListingContentItemsForCurrentUser",
  async (
    listingId: string,
    params: {
      mediaTab?: ListingCreateMediaTab;
      subcategory?: ListingContentSubcategory;
      limit?: number;
      offset?: number;
    }
  ) =>
    withCurrentUserListingAccess(listingId, async ({ user }) =>
      getListingContentItems({
        userId: user.id,
        listingId,
        mediaTab: params.mediaTab,
        subcategory: params.subcategory,
        limit: params.limit,
        offset: params.offset
      })
    )
);
