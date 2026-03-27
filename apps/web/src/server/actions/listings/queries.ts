"use server";

import { withServerActionCaller } from "@web/src/server/infra/logger/callContext";
import { withCurrentUser } from "@web/src/server/actions/shared/auth";
import { getUserListingSummariesPage } from "@web/src/server/models/listings";

export const getCurrentUserListingSummariesPage = withServerActionCaller(
  "getCurrentUserListingSummariesPage",
  async (params: { limit: number; offset: number }) =>
    withCurrentUser(async ({ user }) =>
      getUserListingSummariesPage(user.id, params)
    )
);
