"use server";

import { withServerActionCaller } from "@web/src/server/infra/logger/callContext";
import { requireAuthenticatedUser } from "@web/src/server/actions/_auth/api";
import {
  createListing,
  touchListingActivity,
  updateListing
} from "@web/src/server/models/listings";
import type { UpdateListingInput } from "@web/src/server/models/listings/types";

const LISTING_ACTIVITY_TOUCH_WINDOW_MINUTES = 10;

export const createListingForCurrentUser = withServerActionCaller(
  "createListingForCurrentUser",
  async () => {
    const user = await requireAuthenticatedUser();
    return createListing(user.id);
  }
);

export const updateListingForCurrentUser = withServerActionCaller(
  "updateListingForCurrentUser",
  async (listingId: string, updates: UpdateListingInput) => {
    const user = await requireAuthenticatedUser();
    return updateListing(user.id, listingId, updates);
  }
);

export const touchListingActivityForCurrentUser = withServerActionCaller(
  "touchListingActivityForCurrentUser",
  async (listingId: string) => {
    const user = await requireAuthenticatedUser();
    return touchListingActivity(
      user.id,
      listingId,
      LISTING_ACTIVITY_TOUCH_WINDOW_MINUTES
    );
  }
);
