"use server";

/**
 * Server actions for vision AI-related operations
 * These must run server-side to access API keys securely
 */

import imageProcessorService, {
  type ProcessingResult
} from "../../services/imageProcessor";
import type { SerializableImageData } from "@web/src/types/images";
import { createChildLogger, logger as baseLogger } from "../../../lib/logger";
import { db, listingImages, and, eq, inArray } from "@db/client";
import {
  assignPrimaryListingImageForCategory,
  getListingById
} from "../db/listings";

const logger = createChildLogger(baseLogger, { module: "vision-actions" });

const assignPrimaryImagesByCategory = async (
  userId: string,
  listingId: string,
  categories: string[]
) => {
  const uniqueCategories = Array.from(
    new Set(categories.filter((category) => category.trim() !== ""))
  );
  if (uniqueCategories.length === 0) {
    return;
  }

  await Promise.all(
    uniqueCategories.map((category) =>
      assignPrimaryListingImageForCategory(userId, listingId, category)
    )
  );
};

/**
 * Analyze images workflow (server action)
 * Orchestrates classification → categorization
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
      primaryScore: image.primaryScore ?? null,
      status: "uploaded",
      isPrimary: image.isPrimary ?? false,
      metadata: image.metadata ?? null,
      error: undefined,
      uploadUrl: undefined
    })
  );

  const updateListingImage = async (image: SerializableImageData) => {
    await db
      .update(listingImages)
      .set({
        category: image.category ?? null,
        confidence: image.confidence ?? null,
        primaryScore: image.primaryScore ?? null,
        metadata: image.metadata ?? undefined
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
  await assignPrimaryImagesByCategory(
    userId,
    listingId,
    result.images
      .map((image) => image.category ?? "")
      .filter((category) => category !== "")
  );

  return result.stats;
}

/**
 * Categorize a specific set of listing images with AI vision and persist results
 *
 * @param userId - Authenticated user id
 * @param listingId - Listing id to categorize
 * @param imageIds - Listing image ids to categorize
 * @param options - Optional AI concurrency settings
 */
export async function categorizeListingImagesByIds(
  userId: string,
  listingId: string,
  imageIds: string[],
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
  if (!imageIds || imageIds.length === 0) {
    return {
      total: 0,
      uploaded: 0,
      analyzed: 0,
      failed: 0,
      successRate: 100,
      avgConfidence: 0,
      totalDuration: 0
    };
  }

  const listing = await getListingById(userId, listingId);
  if (!listing) {
    throw new Error("Listing not found");
  }

  const images = await db
    .select()
    .from(listingImages)
    .where(
      and(
        eq(listingImages.listingId, listingId),
        inArray(listingImages.id, imageIds)
      )
    );

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
      primaryScore: image.primaryScore ?? null,
      status: "uploaded",
      isPrimary: image.isPrimary ?? false,
      metadata: image.metadata ?? null,
      error: undefined,
      uploadUrl: undefined
    })
  );

  const updateListingImage = async (image: SerializableImageData) => {
    await db
      .update(listingImages)
      .set({
        category: image.category ?? null,
        confidence: image.confidence ?? null,
        primaryScore: image.primaryScore ?? null,
        metadata: image.metadata ?? undefined
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
  await assignPrimaryImagesByCategory(
    userId,
    listingId,
    result.images
      .map((image) => image.category ?? "")
      .filter((category) => category !== "")
  );

  return result.stats;
}
