"use server";

import {
  requireListingId,
  requireUserId
} from "@web/src/server/actions/shared/validation";
import type { VisionActionOptions, VisionStats } from "./types";
import { buildNoopStats } from "./types";
import { runListingImagesCategorizationWorkflow } from "@web/src/server/services/imageCategorization";

export async function categorizeListingImages(
  userId: string,
  listingId: string,
  options: VisionActionOptions = {}
): Promise<VisionStats> {
  requireUserId(userId, "User ID is required to categorize listing images");
  requireListingId(
    listingId,
    "Listing ID is required to categorize listing images"
  );

  return runListingImagesCategorizationWorkflow(userId, listingId, {
    aiConcurrency: options.aiConcurrency
  });
}

export async function categorizeListingImagesByIds(
  userId: string,
  listingId: string,
  imageIds: string[],
  options: VisionActionOptions = {}
): Promise<VisionStats> {
  requireUserId(userId, "User ID is required to categorize listing images");
  requireListingId(
    listingId,
    "Listing ID is required to categorize listing images"
  );

  if (!imageIds || imageIds.length === 0) {
    return buildNoopStats(0, 0);
  }

  return runListingImagesCategorizationWorkflow(
    userId,
    listingId,
    { aiConcurrency: options.aiConcurrency },
    imageIds
  );
}
