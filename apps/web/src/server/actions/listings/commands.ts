"use server";

import { withServerActionCaller } from "@web/src/server/infra/logger/callContext";
import { withCurrentUser } from "@web/src/server/actions/shared/auth";
import {
  createListing,
  touchListingActivity,
  updateListing
} from "@web/src/server/models/listings";
import type { UpdateListingInput } from "@web/src/server/models/listings/types";

const LISTING_ACTIVITY_TOUCH_WINDOW_MINUTES = 10;

export const createListingForCurrentUser = withServerActionCaller(
  "createListingForCurrentUser",
  async () => withCurrentUser(async ({ user }) => createListing(user.id))
);

export const updateListingForCurrentUser = withServerActionCaller(
  "updateListingForCurrentUser",
  async (listingId: string, updates: UpdateListingInput) =>
    withCurrentUser(async ({ user }) =>
      updateListing(user.id, listingId, updates)
    )
);

export const touchListingActivityForCurrentUser = withServerActionCaller(
  "touchListingActivityForCurrentUser",
  async (listingId: string) =>
    withCurrentUser(async ({ user }) =>
      touchListingActivity(
        user.id,
        listingId,
        LISTING_ACTIVITY_TOUCH_WINDOW_MINUTES
      )
    )
);
