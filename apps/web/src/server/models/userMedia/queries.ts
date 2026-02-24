"use server";

import { db, desc, eq, userMedia } from "@db/client";
import type { DBUserMedia } from "@db/types/models";
import { withDbErrorHandling } from "@web/src/server/models/shared/dbErrorHandling";
import { requireUserId } from "@web/src/server/models/shared/validation";

export async function getUserMedia(userId: string): Promise<DBUserMedia[]> {
  requireUserId(userId, "User ID is required to fetch media");

  return withDbErrorHandling(
    async () => {
      return db
        .select()
        .from(userMedia)
        .where(eq(userMedia.userId, userId))
        .orderBy(desc(userMedia.uploadedAt));
    },
    {
      actionName: "getUserMedia",
      context: { userId },
      errorMessage: "Failed to fetch media. Please try again."
    }
  );
}
