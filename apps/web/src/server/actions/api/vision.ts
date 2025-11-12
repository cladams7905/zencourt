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
import type { ProcessedImage } from "@web/src/types/images";
import { createChildLogger, logger as baseLogger } from "../../../lib/logger";

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

    logger.info({ imageUrl, roomType }, "Scene description generated");

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
 * @param images - Array of ProcessedImage objects with uploadUrl set
 * @param options - Configuration for concurrency
 * @returns Processing result with analyzed images, stats, and categorized groups
 */
export async function analyzeImagesWorkflow(
  images: ProcessedImage[],
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
