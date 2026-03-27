"use server";

import { db, eq, userAdditional } from "@db/client";
import type { DBUserAdditional, InsertDBUserAdditional } from "@db/types/models";
import { withDbErrorHandling } from "@web/src/server/models/shared/dbErrorHandling";
import { requireUserId } from "@web/src/server/models/shared/validation";
import type {
  LocationDetailsInput,
  UserProfileUpdates,
  WelcomeSurveyUpdates,
  WritingStyleUpdates
} from "./types";
import {
  ensureUserAdditionalExists,
  upsertUserAdditional
} from "./helpers";

export async function completeWelcomeSurvey(
  userId: string,
  updates: WelcomeSurveyUpdates
): Promise<DBUserAdditional> {
  requireUserId(userId, "User ID is required to complete the survey");

  return withDbErrorHandling(
    async () => {
      const surveyUpdates = {
        ...updates,
        county: updates.county ?? null,
        serviceAreas: updates.serviceAreas ?? null,
        surveyCompletedAt: new Date(),
        updatedAt: new Date()
      };

      return upsertUserAdditional(userId, surveyUpdates, "Survey could not be saved");
    },
    {
      actionName: "completeWelcomeSurvey",
      context: { userId },
      errorMessage: "Failed to save survey responses. Please try again."
    }
  );
}

export async function updateTargetAudiences(
  userId: string,
  targetAudiences: NonNullable<InsertDBUserAdditional["targetAudiences"]>,
  audienceDescription?: InsertDBUserAdditional["audienceDescription"]
): Promise<DBUserAdditional> {
  requireUserId(userId, "User ID is required to update target audiences");

  return withDbErrorHandling(
    async () => {
      await ensureUserAdditionalExists(userId);
      const [record] = await db
        .update(userAdditional)
        .set({
          targetAudiences,
          audienceDescription: audienceDescription ?? null,
          updatedAt: new Date()
        })
        .where(eq(userAdditional.userId, userId))
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
  updates: UserProfileUpdates
): Promise<DBUserAdditional> {
  requireUserId(userId, "User ID is required to update profile");

  return withDbErrorHandling(
    async () => {
      const profileUpdates = {
        ...updates,
        updatedAt: new Date()
      };

      if (updates.agentName && updates.agentName.trim()) {
        Object.assign(profileUpdates, { profileCompletedAt: new Date() });
      }

      return upsertUserAdditional(userId, profileUpdates, "Profile could not be saved");
    },
    {
      actionName: "updateUserProfile",
      context: { userId },
      errorMessage: "Failed to save profile. Please try again."
    }
  );
}

export async function updateUserLocation(
  userId: string,
  location: InsertDBUserAdditional["location"],
  details?: LocationDetailsInput
): Promise<DBUserAdditional> {
  requireUserId(userId, "User ID is required to update location");

  return withDbErrorHandling(
    async () => {
      return upsertUserAdditional(
        userId,
        {
          location,
          county: details?.county ?? null,
          serviceAreas: details?.serviceAreas ?? null,
          updatedAt: new Date()
        },
        "Location could not be saved"
      );
    },
    {
      actionName: "updateUserLocation",
      context: { userId, location },
      errorMessage: "Failed to save location. Please try again."
    }
  );
}

export async function updateWritingStyle(
  userId: string,
  updates: WritingStyleUpdates
): Promise<DBUserAdditional> {
  requireUserId(userId, "User ID is required to update writing style");

  return withDbErrorHandling(
    async () => {
      const styleUpdates = {
        ...updates,
        writingStyleCompletedAt: new Date(),
        updatedAt: new Date()
      };

      return upsertUserAdditional(
        userId,
        styleUpdates,
        "Writing style could not be saved"
      );
    },
    {
      actionName: "updateWritingStyle",
      context: { userId },
      errorMessage: "Failed to save writing style. Please try again."
    }
  );
}

export async function markProfileCompleted(
  userId: string
): Promise<DBUserAdditional> {
  requireUserId(userId, "User ID is required to mark profile completion");

  return withDbErrorHandling(
    async () => {
      await ensureUserAdditionalExists(userId);
      const [record] = await db
        .update(userAdditional)
        .set({
          profileCompletedAt: new Date(),
          updatedAt: new Date()
        })
        .where(eq(userAdditional.userId, userId))
        .returning();

      if (!record) {
        throw new Error("Profile completion could not be saved");
      }

      return record;
    },
    {
      actionName: "markProfileCompleted",
      context: { userId },
      errorMessage: "Failed to update profile completion. Please try again."
    }
  );
}

export async function markWritingStyleCompleted(
  userId: string
): Promise<DBUserAdditional> {
  requireUserId(userId, "User ID is required to mark writing style completion");

  return withDbErrorHandling(
    async () => {
      await ensureUserAdditionalExists(userId);
      const [record] = await db
        .update(userAdditional)
        .set({
          writingStyleCompletedAt: new Date(),
          updatedAt: new Date()
        })
        .where(eq(userAdditional.userId, userId))
        .returning();

      if (!record) {
        throw new Error("Writing style completion could not be saved");
      }

      return record;
    },
    {
      actionName: "markWritingStyleCompleted",
      context: { userId },
      errorMessage: "Failed to update writing style completion. Please try again."
    }
  );
}
