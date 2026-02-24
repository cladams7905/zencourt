"use server";

import imageCategorizationService, {
  type CategorizationResult
} from "@web/src/server/services/imageCategorization";
import type { SerializableImageData } from "@web/src/lib/domain/listing/images";
import {
  createChildLogger,
  logger as baseLogger
} from "@web/src/lib/core/logging/logger";
import type { VisionActionOptions } from "./types";

const logger = createChildLogger(baseLogger, { module: "vision-actions" });

export async function analyzeImagesWorkflow(
  images: SerializableImageData[],
  options: VisionActionOptions = {}
): Promise<CategorizationResult> {
  try {
    logger.info({ total: images.length }, "Starting image analysis workflow");

    const result = await imageCategorizationService.analyzeImagesWorkflow(
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
