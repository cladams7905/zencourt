"use server";

import { withServerActionCaller } from "@web/src/server/infra/logger/callContext";
import { requireAuthenticatedUser } from "@web/src/server/actions/_auth/api";
import { getUserListingSummariesPage } from "@web/src/server/models/listings";

export const getCurrentUserListingSummariesPage = withServerActionCaller(
  "serverAction:getCurrentUserListingSummariesPage",
  async (params: { limit: number; offset: number }) => {
    const user = await requireAuthenticatedUser();
    return getUserListingSummariesPage(user.id, params);
  }
);
