"use server";

import { withServerActionCaller } from "@web/src/server/infra/logger/callContext";
import {
  createChildLogger,
  logger as baseLogger
} from "@web/src/lib/core/logging/logger";
import type { InsertDBUserAdditional } from "@db/types/models";
import { withCurrentUser } from "@web/src/server/actions/shared/auth";
import { db, eq, userAdditional } from "@db/client";
import {
  markProfileCompleted,
  markWritingStyleCompleted,
  updateTargetAudiences,
  updateUserLocation,
  updateUserProfile,
  updateWritingStyle,
  completeWelcomeSurvey
} from "@web/src/server/models/user";
import type {
  UserProfileUpdates,
  WelcomeSurveyUpdates,
  WritingStyleUpdates
} from "@web/src/server/models/user";
import storageService from "@web/src/server/services/storage";
import { upsertUserAdditional } from "@web/src/server/models/user/additional/helpers";

const logger = createChildLogger(baseLogger, { module: "user-actions" });

export const updateCurrentUserProfile = withServerActionCaller(
  "updateCurrentUserProfile",
  async (updates: UserProfileUpdates) =>
    withCurrentUser(async ({ user }) => updateUserProfile(user.id, updates))
);

export const ensureCurrentUserGoogleHeadshot = withServerActionCaller(
  "ensureCurrentUserGoogleHeadshot",
  async (googleImageUrl: string) =>
    withCurrentUser(async ({ user }) => {
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
        logger.warn(
          { userId: user.id, status: response.status },
          "Failed to download Google headshot"
        );
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
        logger.warn(
          { userId: user.id, error: uploadResult.error ?? null },
          "Failed to upload Google headshot"
        );
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
    })
);

export const updateCurrentUserLocation = withServerActionCaller(
  "updateCurrentUserLocation",
  async (
    location: InsertDBUserAdditional["location"],
    details?: {
      county?: string | null;
      serviceAreas?: string[] | null;
    }
  ) =>
    withCurrentUser(async ({ user }) =>
      updateUserLocation(user.id, location, {
        county: details?.county ?? null,
        serviceAreas: details?.serviceAreas ?? null
      })
    )
);

export const updateCurrentUserTargetAudiences = withServerActionCaller(
  "updateCurrentUserTargetAudiences",
  async (
    targetAudiences: NonNullable<InsertDBUserAdditional["targetAudiences"]>,
    audienceDescription?: InsertDBUserAdditional["audienceDescription"]
  ) =>
    withCurrentUser(async ({ user }) =>
      updateTargetAudiences(user.id, targetAudiences, audienceDescription)
    )
);

export const updateCurrentUserWritingStyle = withServerActionCaller(
  "updateCurrentUserWritingStyle",
  async (updates: WritingStyleUpdates) =>
    withCurrentUser(async ({ user }) => updateWritingStyle(user.id, updates))
);

export const markCurrentUserWritingStyleCompleted = withServerActionCaller(
  "markCurrentUserWritingStyleCompleted",
  async () =>
    withCurrentUser(async ({ user }) => markWritingStyleCompleted(user.id))
);

export const markCurrentUserProfileCompleted = withServerActionCaller(
  "markCurrentUserProfileCompleted",
  async () => withCurrentUser(async ({ user }) => markProfileCompleted(user.id))
);

export const completeCurrentUserWelcomeSurvey = withServerActionCaller(
  "completeCurrentUserWelcomeSurvey",
  async (updates: WelcomeSurveyUpdates) =>
    withCurrentUser(async ({ user }) => completeWelcomeSurvey(user.id, updates))
);
