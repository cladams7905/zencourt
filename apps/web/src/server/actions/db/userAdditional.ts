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
