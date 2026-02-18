"use server";

import { db, eq, userAdditional } from "@db/client";
import type { DBUserAdditional } from "@shared/types/models";
import { withDbErrorHandling } from "@web/src/server/actions/shared/dbErrorHandling";
import { requireUserId } from "@web/src/server/actions/shared/validation";

export async function getOrCreateUserAdditional(
  userId: string
): Promise<DBUserAdditional> {
  requireUserId(userId, "User ID is required to fetch user details");

  return withDbErrorHandling(
    async () => {
      await db.insert(userAdditional).values({ userId }).onConflictDoNothing();

      const [record] = await db
        .select()
        .from(userAdditional)
        .where(eq(userAdditional.userId, userId));

      if (!record) {
        throw new Error("Failed to load user details");
      }

      return record;
    },
    {
      actionName: "getOrCreateUserAdditional",
      context: { userId },
      errorMessage: "Failed to load user details. Please try again."
    }
  );
}

export async function getUserProfileCompletion(userId: string): Promise<{
  profileCompleted: boolean;
  writingStyleCompleted: boolean;
  mediaUploaded: boolean;
}> {
  requireUserId(userId, "User ID is required to check profile completion");

  return withDbErrorHandling(
    async () => {
      const [record] = await db
        .select()
        .from(userAdditional)
        .where(eq(userAdditional.userId, userId));

      if (!record) {
        return {
          profileCompleted: false,
          writingStyleCompleted: false,
          mediaUploaded: false
        };
      }

      return {
        profileCompleted: !!record.profileCompletedAt,
        writingStyleCompleted: !!record.writingStyleCompletedAt,
        mediaUploaded: !!record.mediaUploadedAt
      };
    },
    {
      actionName: "getUserProfileCompletion",
      context: { userId },
      errorMessage: "Failed to check profile completion. Please try again."
    }
  );
}
