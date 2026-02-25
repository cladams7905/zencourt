"use server";

import { requireAuthenticatedUser } from "@web/src/server/actions/_auth/api";
import { getUserListingSummariesPage } from "@web/src/server/models/listings";

export async function getCurrentUserListingSummariesPage(params: {
  limit: number;
  offset: number;
}) {
  const user = await requireAuthenticatedUser();
  return getUserListingSummariesPage(user.id, params);
}
