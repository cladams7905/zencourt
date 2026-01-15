"use server";

import { db, userAdditional, eq } from "@db/client";
import type {
  DBUserAdditional,
  InsertDBUserAdditional
} from "@shared/types/models";
import { withDbErrorHandling } from "../_utils";

export async function getOrCreateUserAdditional(
  userId: string
): Promise<DBUserAdditional> {
  if (!userId || userId.trim() === "") {
    throw new Error("User ID is required to fetch user details");
  }

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

export async function completeWelcomeSurvey(
  userId: string,
  updates: Pick<
    InsertDBUserAdditional,
    | "referralSource"
    | "referralSourceOther"
    | "location"
    | "targetAudiences"
    | "weeklyPostingFrequency"
  >
): Promise<DBUserAdditional> {
  if (!userId || userId.trim() === "") {
    throw new Error("User ID is required to complete the survey");
  }

  return withDbErrorHandling(
    async () => {
      const surveyUpdates = {
        ...updates,
        surveyCompletedAt: new Date(),
        updatedAt: new Date()
      };

      const [record] = await db
        .insert(userAdditional)
        .values({
          userId,
          ...surveyUpdates
        })
        .onConflictDoUpdate({
          target: userAdditional.userId,
          set: surveyUpdates
        })
        .returning();

      if (!record) {
        throw new Error("Survey could not be saved");
      }

      return record;
    },
    {
      actionName: "completeWelcomeSurvey",
      context: { userId },
      errorMessage: "Failed to save survey responses. Please try again."
    }
  );
}

export async function markWelcomeSurveyCompleted(
  userId: string
): Promise<DBUserAdditional> {
  if (!userId || userId.trim() === "") {
    throw new Error("User ID is required to complete the survey");
  }

  return withDbErrorHandling(
    async () => {
      const [record] = await db
        .insert(userAdditional)
        .values({
          userId,
          surveyCompletedAt: new Date(),
          updatedAt: new Date()
        })
        .onConflictDoUpdate({
          target: userAdditional.userId,
          set: {
            surveyCompletedAt: new Date(),
            updatedAt: new Date()
          }
        })
        .returning();

      if (!record) {
        throw new Error("Survey completion could not be saved");
      }

      return record;
    },
    {
      actionName: "markWelcomeSurveyCompleted",
      context: { userId },
      errorMessage: "Failed to complete survey. Please try again."
    }
  );
}

export async function updateTargetAudiences(
  userId: string,
  targetAudiences: string
): Promise<DBUserAdditional> {
  if (!userId || userId.trim() === "") {
    throw new Error("User ID is required to update target audiences");
  }

  return withDbErrorHandling(
    async () => {
      const [record] = await db
        .insert(userAdditional)
        .values({
          userId,
          targetAudiences,
          updatedAt: new Date()
        })
        .onConflictDoUpdate({
          target: userAdditional.userId,
          set: {
            targetAudiences,
            updatedAt: new Date()
          }
        })
        .returning();

      if (!record) {
        throw new Error("Target audiences could not be saved");
      }

      return record;
    },
    {
      actionName: "updateTargetAudiences",
      context: { userId },
      errorMessage: "Failed to save target audiences. Please try again."
    }
  );
}

export async function updateUserProfile(
  userId: string,
  updates: Pick<
    InsertDBUserAdditional,
    "agentName" | "brokerageName" | "agentTitle" | "avatarImageUrl" | "brokerLogoUrl"
  >
): Promise<DBUserAdditional> {
  if (!userId || userId.trim() === "") {
    throw new Error("User ID is required to update profile");
  }

  return withDbErrorHandling(
    async () => {
      const profileUpdates = {
        ...updates,
        updatedAt: new Date()
      };

      // Mark as completed if name and brokerage are provided
      if (updates.agentName && updates.brokerageName) {
        Object.assign(profileUpdates, { profileCompletedAt: new Date() });
      }

      const [record] = await db
        .insert(userAdditional)
        .values({
          userId,
          ...profileUpdates
        })
        .onConflictDoUpdate({
          target: userAdditional.userId,
          set: profileUpdates
        })
        .returning();

      if (!record) {
        throw new Error("Profile could not be saved");
      }

      return record;
    },
    {
      actionName: "updateUserProfile",
      context: { userId },
      errorMessage: "Failed to save profile. Please try again."
    }
  );
}

export async function updateWritingStyle(
  userId: string,
  updates: Pick<
    InsertDBUserAdditional,
    "writingStylePreset" | "writingStyleCustom" | "writingStyleExamples"
  >
): Promise<DBUserAdditional> {
  if (!userId || userId.trim() === "") {
    throw new Error("User ID is required to update writing style");
  }

  return withDbErrorHandling(
    async () => {
      const styleUpdates = {
        ...updates,
        writingStyleCompletedAt: new Date(),
        updatedAt: new Date()
      };

      const [record] = await db
        .insert(userAdditional)
        .values({
          userId,
          ...styleUpdates
        })
        .onConflictDoUpdate({
          target: userAdditional.userId,
          set: styleUpdates
        })
        .returning();

      if (!record) {
        throw new Error("Writing style could not be saved");
      }

      return record;
    },
    {
      actionName: "updateWritingStyle",
      context: { userId },
      errorMessage: "Failed to save writing style. Please try again."
    }
  );
}

export async function getUserProfileCompletion(userId: string): Promise<{
  profileCompleted: boolean;
  writingStyleCompleted: boolean;
  mediaUploaded: boolean;
}> {
  if (!userId || userId.trim() === "") {
    throw new Error("User ID is required to check profile completion");
  }

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
