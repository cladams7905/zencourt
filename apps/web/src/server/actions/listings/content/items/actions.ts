"use server";

import { withServerActionCaller } from "@web/src/server/infra/logger/callContext";
import { requireAuthenticatedUser } from "@web/src/server/actions/_auth/api";
import { requireListingAccess } from "@web/src/server/models/listings/access";
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
  ) => {
    const user = await requireAuthenticatedUser();
    await requireListingAccess(listingId, user.id);
    return getListingContentItems({
      userId: user.id,
      listingId,
      mediaTab: params.mediaTab,
      subcategory: params.subcategory,
      limit: params.limit,
      offset: params.offset
    });
  }
);
