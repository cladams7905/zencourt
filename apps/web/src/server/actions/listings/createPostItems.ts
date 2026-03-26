"use server";

import { withServerActionCaller } from "@web/src/server/infra/logger/callContext";
import { requireAuthenticatedUser } from "@web/src/server/actions/_auth/api";
import { requireListingAccess } from "@web/src/server/models/listings/access";
import type { ListingCreateMediaTab } from "@web/src/components/listings/create/shared/constants";
import type { ListingContentSubcategory } from "@shared/types/models";
import { getListingCreatePostItems } from "./queries";

export const getListingCreatePostItemsForCurrentUser = withServerActionCaller(
  "getListingCreatePostItemsForCurrentUser",
  async (
    listingId: string,
    params: {
      mediaTab?: ListingCreateMediaTab;
      subcategory?: ListingContentSubcategory;
    }
  ) => {
    const user = await requireAuthenticatedUser();
    await requireListingAccess(listingId, user.id);
    return getListingCreatePostItems({
      userId: user.id,
      listingId,
      mediaTab: params.mediaTab,
      subcategory: params.subcategory
    });
  }
);
