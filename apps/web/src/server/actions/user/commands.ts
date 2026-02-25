"use server";

import type { InsertDBUserAdditional } from "@db/types/models";
import { requireAuthenticatedUser } from "@web/src/server/actions/_auth/api";
import { db, eq, userAdditional } from "@db/client";
import {
  markProfileCompleted,
  markWritingStyleCompleted,
  updateTargetAudiences,
  updateUserLocation,
  updateUserProfile,
  updateWritingStyle,
  completeWelcomeSurvey
} from "@web/src/server/models/userAdditional";
import type {
  UserProfileUpdates,
  WelcomeSurveyUpdates,
  WritingStyleUpdates
} from "@web/src/server/models/userAdditional/types";
import storageService from "@web/src/server/services/storage";
import { upsertUserAdditional } from "@web/src/server/models/userAdditional/helpers";

export async function updateCurrentUserProfile(updates: UserProfileUpdates) {
  const user = await requireAuthenticatedUser();
  return updateUserProfile(user.id, updates);
}

export async function ensureCurrentUserGoogleHeadshot(googleImageUrl: string) {
  const user = await requireAuthenticatedUser();
  if (!googleImageUrl) {
    return null;
  }

  const [existing] = await db
    .select({ headshotUrl: userAdditional.headshotUrl })
    .from(userAdditional)
    .where(eq(userAdditional.userId, user.id));

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
      folder: `user_${user.id}/branding`
    }
  });

  if (!uploadResult.success || !uploadResult.url) {
    throw new Error(uploadResult.error || "Headshot upload failed");
  }

  const record = await upsertUserAdditional(
    user.id,
    {
      headshotUrl: uploadResult.url,
      updatedAt: new Date()
    },
    "Headshot could not be saved"
  );

  return record?.headshotUrl ?? uploadResult.url;
}

export async function updateCurrentUserLocation(
  location: InsertDBUserAdditional["location"],
  details?: {
    county?: string | null;
    serviceAreas?: string[] | null;
  }
) {
  const user = await requireAuthenticatedUser();
  return updateUserLocation(user.id, location, {
    county: details?.county ?? null,
    serviceAreas: details?.serviceAreas ?? null
  });
}

export async function updateCurrentUserTargetAudiences(
  targetAudiences: NonNullable<InsertDBUserAdditional["targetAudiences"]>,
  audienceDescription?: InsertDBUserAdditional["audienceDescription"]
) {
  const user = await requireAuthenticatedUser();
  return updateTargetAudiences(user.id, targetAudiences, audienceDescription);
}

export async function updateCurrentUserWritingStyle(
  updates: WritingStyleUpdates
) {
  const user = await requireAuthenticatedUser();
  return updateWritingStyle(user.id, updates);
}

export async function markCurrentUserWritingStyleCompleted() {
  const user = await requireAuthenticatedUser();
  return markWritingStyleCompleted(user.id);
}

export async function markCurrentUserProfileCompleted() {
  const user = await requireAuthenticatedUser();
  return markProfileCompleted(user.id);
}

export async function completeCurrentUserWelcomeSurvey(
  updates: WelcomeSurveyUpdates
) {
  const user = await requireAuthenticatedUser();
  return completeWelcomeSurvey(user.id, updates);
}
