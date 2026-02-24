"use server";

import imageCategorizationService from "@web/src/server/services/imageCategorization";
import {
  requireListingId,
  requireUserId
} from "@web/src/server/actions/shared/validation";
import type { VisionActionOptions, VisionStats } from "./types";
import { buildNoopStats } from "./types";
import {
  assertListingExists,
  assignPrimaryImagesByCategory,
  loadListingImages,
  persistListingImageAnalysis,
  toSerializableImageData
} from "./helpers";

async function categorizeListingImagesCore(
  userId: string,
  listingId: string,
  options: VisionActionOptions,
  imageIds?: string[]
): Promise<VisionStats> {
  await assertListingExists(userId, listingId);

  const images = await loadListingImages(listingId, imageIds);
  const needsAnalysis = images.filter((image) => !image.category);

  if (needsAnalysis.length === 0) {
    return buildNoopStats(images.length, images.length);
  }

  const serializableImages = needsAnalysis.map(toSerializableImageData);
  const result = await imageCategorizationService.analyzeImagesWorkflow(
    serializableImages,
    {
      aiConcurrency: options.aiConcurrency,
      onProgress: (progress) => {
        if (!progress.currentImage) {
          return;
        }
        void persistListingImageAnalysis(listingId, progress.currentImage);
      }
    }
  );

  await Promise.all(
    result.images.map((image) => persistListingImageAnalysis(listingId, image))
  );

  await assignPrimaryImagesByCategory(
    userId,
    listingId,
    result.images
      .map((image) => image.category ?? "")
      .filter((category) => category !== "")
  );

  return result.stats;
}

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

  return categorizeListingImagesCore(userId, listingId, options);
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

  return categorizeListingImagesCore(userId, listingId, options, imageIds);
}
