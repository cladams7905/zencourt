"use server";

import { withServerActionCaller } from "@web/src/server/infra/logger/callContext";
import { getUser } from "@web/src/server/models/users";
import { getOrCreateUserAdditional } from "@web/src/server/models/userAdditional";
import { getUserListings } from "@web/src/server/models/listings";

export const getCurrentUserSidebarData = withServerActionCaller(
  "getCurrentUserSidebarData",
  async () => {
    const user = await getUser();
    if (!user) {
      return null;
    }

    const userAdditional = await getOrCreateUserAdditional(user.id);
    const listings = (await getUserListings(user.id)).map((listing) => ({
      id: listing.id,
      title: listing.title ?? null,
      listingStage: listing.listingStage ?? null,
      lastOpenedAt: listing.lastOpenedAt ?? null
    }));

    return {
      user,
      userAdditional,
      listings
    };
  }
);
