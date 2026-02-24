"use server";

import {
  analyzeImagesWorkflow as runAnalyzeImagesWorkflow,
  runListingImagesCategorizationWorkflow,
  type CategorizationResult
} from "@web/src/server/services/imageCategorization";
import type { SerializableImageData } from "@web/src/lib/domain/listing/images";
import {
  createChildLogger,
  logger as baseLogger
} from "@web/src/lib/core/logging/logger";
import {
  requireAuthenticatedUser
} from "@web/src/server/utils/apiAuth";
import type {
  ImageCategorizationActionOptions,
  ImageCategorizationStats
} from "./types";
import { buildNoopStats } from "./types";

const logger = createChildLogger(baseLogger, {
  module: "image-categorization-actions"
});

export async function analyzeImagesWorkflow(
  images: SerializableImageData[],
  options: ImageCategorizationActionOptions = {}
): Promise<CategorizationResult> {
  try {
    logger.info({ total: images.length }, "Starting image analysis workflow");

    const result = await runAnalyzeImagesWorkflow(images, options);

    logger.info(
      {
        total: result.images.length,
        analyzed: result.stats.analyzed,
        failed: result.stats.failed
      },
      "Image analysis workflow completed"
    );

    return result;
  } catch (error) {
    logger.error(
      {
        error:
          error instanceof Error
            ? { name: error.name, message: error.message }
            : error
      },
      "Image analysis workflow failed"
    );

    throw new Error(
      `Failed to analyze images: ${
        error instanceof Error ? error.message : "Unknown error"
      }`
    );
  }
}

export async function categorizeListingImages(
  userId: string,
  listingId: string,
  options: ImageCategorizationActionOptions = {}
): Promise<ImageCategorizationStats> {
  return runListingImagesCategorizationWorkflow(userId, listingId, {
    aiConcurrency: options.aiConcurrency
  });
}

export async function categorizeListingImagesByIds(
  userId: string,
  listingId: string,
  imageIds: string[],
  options: ImageCategorizationActionOptions = {}
): Promise<ImageCategorizationStats> {
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

export async function categorizeListingImagesForCurrentUser(
  listingId: string,
  options: ImageCategorizationActionOptions = {}
): Promise<ImageCategorizationStats> {
  const user = await requireAuthenticatedUser();
  return categorizeListingImages(user.id, listingId, options);
}
