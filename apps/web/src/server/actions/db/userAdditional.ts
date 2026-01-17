"use server";

import { db, userAdditional, eq } from "@db/client";
import type {
  DBUserAdditional,
  InsertDBUserAdditional
} from "@shared/types/models";
import { withDbErrorHandling } from "../_utils";
import storageService from "@web/src/server/services/storageService";

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

export async function updateTargetAudiences(
  userId: string,
  targetAudiences: NonNullable<InsertDBUserAdditional["targetAudiences"]>
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
    | "agentName"
    | "brokerageName"
    | "agentTitle"
    | "headshotUrl"
    | "personalLogoUrl"
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

export async function updateUserLocation(
  userId: string,
  location: InsertDBUserAdditional["location"]
): Promise<DBUserAdditional> {
  if (!userId || userId.trim() === "") {
    throw new Error("User ID is required to update location");
  }

  return withDbErrorHandling(
    async () => {
      const [record] = await db
        .insert(userAdditional)
        .values({
          userId,
          location,
          updatedAt: new Date()
        })
        .onConflictDoUpdate({
          target: userAdditional.userId,
          set: {
            location,
            updatedAt: new Date()
          }
        })
        .returning();

      if (!record) {
        throw new Error("Location could not be saved");
      }

      return record;
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
  updates: Pick<
    InsertDBUserAdditional,
    "writingToneLevel" | "writingStyleCustom"
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

export async function ensureGoogleHeadshot(
  userId: string,
  googleImageUrl: string
): Promise<string | null> {
  if (!userId || userId.trim() === "") {
    throw new Error("User ID is required to update headshot");
  }
  if (!googleImageUrl) {
    return null;
  }

  return withDbErrorHandling(
    async () => {
      const [existing] = await db
        .select({ headshotUrl: userAdditional.headshotUrl })
        .from(userAdditional)
        .where(eq(userAdditional.userId, userId));

      if (existing?.headshotUrl) {
        return existing.headshotUrl;
      }

      const response = await fetch(googleImageUrl, { cache: "no-store" });
      if (!response.ok) {
        throw new Error("Failed to download Google headshot");
      }

      const contentType = response.headers.get("content-type") || "image/jpeg";
      const extension = contentType.includes("png")
        ? "png"
        : contentType.includes("webp")
        ? "webp"
        : "jpg";
      const fileName = `google-headshot.${extension}`;
      const buffer = await response.arrayBuffer();

      const uploadResult = await storageService.uploadFile({
        fileBuffer: buffer,
        fileName,
        contentType,
        options: {
          folder: `user_${userId}/branding`
        }
      });

      if (!uploadResult.success || !uploadResult.url) {
        throw new Error(uploadResult.error || "Headshot upload failed");
      }

      const [record] = await db
        .insert(userAdditional)
        .values({
          userId,
          headshotUrl: uploadResult.url,
          updatedAt: new Date()
        })
        .onConflictDoUpdate({
          target: userAdditional.userId,
          set: {
            headshotUrl: uploadResult.url,
            updatedAt: new Date()
          }
        })
        .returning();

      return record?.headshotUrl ?? uploadResult.url;
    },
    {
      actionName: "ensureGoogleHeadshot",
      context: { userId },
      errorMessage: "Failed to save Google headshot"
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
