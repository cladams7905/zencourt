"use server";

/**
 * Server actions for vision AI-related operations
 * These must run server-side to access API keys securely
 */

import visionService from "../../services/visionService";
import imageProcessorService, {
  type ProcessingResult
} from "../../services/imageProcessor";
import { SceneDescription } from "@web/src/types/vision";
import type { SerializableImageData } from "@web/src/types/images";
import { createChildLogger, logger as baseLogger } from "../../../lib/logger";
import { db, listingImages, and, eq } from "@db/client";
import { getListingById } from "../db/listings";

const logger = createChildLogger(baseLogger, { module: "vision-actions" });

/**
 * Generate scene description for an image (server action)
 *
 * @param imageUrl - Public URL of the image
 * @param roomType - Type of room (bedroom, kitchen, etc)
 * @param options - Optional configuration for timeout and retries
 * @returns Scene description object
 */
export async function generateSceneDescription(
  imageUrl: string,
  roomType: string,
  options?: {
    timeout?: number;
    maxRetries?: number;
  }
): Promise<SceneDescription> {
  try {
    logger.info({ imageUrl, roomType }, "Generating scene description");
    const result = await visionService.generateSceneDescription(
      imageUrl,
      roomType,
      options || {
        timeout: 30000,
        maxRetries: 2
      }
    );

    logger.info({ imageUrl, roomType, result }, "Scene description generated");

    return result;
  } catch (error) {
    logger.error(
      {
        imageUrl,
        roomType,
        error:
          error instanceof Error
            ? { name: error.name, message: error.message }
            : error
      },
      "Scene description failed"
    );
    throw new Error(
      `Failed to generate scene description: ${
        error instanceof Error ? error.message : "Unknown error"
      }`
    );
  }
}

/**
 * Generate scene descriptions for multiple images in batch
 *
 * @param images - Array of {imageUrl, roomType} objects
 * @returns Array of scene descriptions (same order as input)
 */
export async function generateSceneDescriptionsBatch(
  images: Array<{ imageUrl: string; roomType: string }>
): Promise<Array<SceneDescription | null>> {
  logger.info({ total: images.length }, "Generating batch scene descriptions");
  const results = await Promise.allSettled(
    images.map(({ imageUrl, roomType }) =>
      visionService.generateSceneDescription(imageUrl, roomType, {
        timeout: 30000,
        maxRetries: 2
      })
    )
  );

  return results.map((result) => {
    if (result.status === "fulfilled") {
      return result.value;
    } else {
      logger.error(
        {
          error:
            result.reason instanceof Error
              ? { name: result.reason.name, message: result.reason.message }
              : result.reason
        },
        "Scene description in batch failed"
      );
      return null;
    }
  });
}

/**
 * Analyze images workflow (server action)
 * Orchestrates classification → scene descriptions → categorization
 *
 * @param images - Array of SerializableImageData objects with url set
 * @param options - Configuration for concurrency
 * @returns Processing result with analyzed images, stats, and categorized groups
 */
export async function analyzeImagesWorkflow(
  images: SerializableImageData[],
  options: {
    aiConcurrency?: number;
  } = {}
): Promise<ProcessingResult> {
  try {
    logger.info({ total: images.length }, "Starting image analysis workflow");

    const result = await imageProcessorService.analyzeImagesWorkflow(
      images,
      options
    );

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

/**
 * Categorize listing images with AI vision and persist results
 *
 * @param userId - Authenticated user id
 * @param listingId - Listing id to categorize
 * @param options - Optional AI concurrency settings
 */
export async function categorizeListingImages(
  userId: string,
  listingId: string,
  options: {
    aiConcurrency?: number;
  } = {}
): Promise<ProcessingResult["stats"]> {
  if (!userId || userId.trim() === "") {
    throw new Error("User ID is required to categorize listing images");
  }
  if (!listingId || listingId.trim() === "") {
    throw new Error("Listing ID is required to categorize listing images");
  }

  const listing = await getListingById(userId, listingId);
  if (!listing) {
    throw new Error("Listing not found");
  }

  const images = await db
    .select()
    .from(listingImages)
    .where(eq(listingImages.listingId, listingId));

  const needsAnalysis = images.filter((image) => !image.category);
  if (needsAnalysis.length === 0) {
    return {
      total: 0,
      uploaded: images.length,
      analyzed: images.length,
      failed: 0,
      successRate: 100,
      avgConfidence: 0,
      totalDuration: 0
    };
  }

  const serializableImages: SerializableImageData[] = needsAnalysis.map(
    (image) => ({
      id: image.id,
      listingId: image.listingId,
      url: image.url,
      filename: image.filename,
      category: image.category ?? null,
      confidence: image.confidence ?? null,
      features: image.features ?? null,
      sceneDescription: image.sceneDescription ?? null,
      status: "uploaded",
      sortOrder: image.sortOrder ?? null,
      metadata: image.metadata ?? null,
      error: null,
      uploadUrl: null
    })
  );

  const updateListingImage = async (image: SerializableImageData) => {
    await db
      .update(listingImages)
      .set({
        category: image.category ?? null,
        confidence: image.confidence ?? null,
        features: image.features ?? null,
        sceneDescription: image.sceneDescription ?? null
      })
      .where(
        and(
          eq(listingImages.id, image.id),
          eq(listingImages.listingId, listingId)
        )
      );
  };

  const result = await imageProcessorService.analyzeImagesWorkflow(
    serializableImages,
    {
      aiConcurrency: options.aiConcurrency,
      onProgress: (progress) => {
        if (!progress.currentImage) {
          return;
        }
        void updateListingImage(progress.currentImage);
      }
    }
  );

  await Promise.all(result.images.map((image) => updateListingImage(image)));

  return result.stats;
}
