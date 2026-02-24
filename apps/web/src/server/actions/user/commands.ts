"use server";

import type { InsertDBUserAdditional } from "@db/types/models";
import { requireAuthenticatedUser } from "@web/src/server/utils/apiAuth";
import {
  ensureGoogleHeadshot,
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

export async function updateCurrentUserProfile(updates: UserProfileUpdates) {
  const user = await requireAuthenticatedUser();
  return updateUserProfile(user.id, updates);
}

export async function ensureCurrentUserGoogleHeadshot(googleImageUrl: string) {
  const user = await requireAuthenticatedUser();
  return ensureGoogleHeadshot(user.id, googleImageUrl);
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

export async function updateCurrentUserWritingStyle(updates: WritingStyleUpdates) {
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
