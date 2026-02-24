"use server";

import { db, eq, userAdditional } from "@db/client";
import type { DBUserAdditional } from "@db/types/models";
import { withDbErrorHandling } from "@web/src/server/models/shared/dbErrorHandling";
import { requireUserId } from "@web/src/server/models/shared/validation";
import type { UserAdditionalSnapshot } from "./types";
import { ensureUserAdditionalExists } from "./helpers";

export async function getOrCreateUserAdditional(
  userId: string
): Promise<DBUserAdditional> {
  requireUserId(userId, "User ID is required to fetch user details");

  return withDbErrorHandling(
    async () => {
      await ensureUserAdditionalExists(userId);

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

export async function getUserAdditionalSnapshot(
  userId: string
): Promise<UserAdditionalSnapshot> {
  requireUserId(userId, "User ID is required to fetch user additional snapshot");

  return withDbErrorHandling(
    async () => {
      const [record] = await db
        .select({
          targetAudiences: userAdditional.targetAudiences,
          location: userAdditional.location,
          writingToneLevel: userAdditional.writingToneLevel,
          writingStyleCustom: userAdditional.writingStyleCustom,
          agentName: userAdditional.agentName,
          brokerageName: userAdditional.brokerageName,
          agentBio: userAdditional.agentBio,
          audienceDescription: userAdditional.audienceDescription,
          county: userAdditional.county,
          serviceAreas: userAdditional.serviceAreas
        })
        .from(userAdditional)
        .where(eq(userAdditional.userId, userId));

      return {
        targetAudiences: record?.targetAudiences ?? null,
        location: record?.location ?? null,
        writingToneLevel: record?.writingToneLevel ?? null,
        writingStyleCustom: record?.writingStyleCustom ?? null,
        agentName: record?.agentName ?? "",
        brokerageName: record?.brokerageName ?? "",
        agentBio: record?.agentBio ?? null,
        audienceDescription: record?.audienceDescription ?? null,
        county: record?.county ?? null,
        serviceAreas: record?.serviceAreas ?? null
      };
    },
    {
      actionName: "getUserAdditionalSnapshot",
      context: { userId },
      errorMessage: "Failed to load user details. Please try again."
    }
  );
}
