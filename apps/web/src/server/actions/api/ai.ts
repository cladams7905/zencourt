"use server";

/**
 * Server actions for AI-related operations
 * These must run server-side to access API keys securely
 */

import {
  generateSceneDescription as generateSceneDescriptionAPI,
  type SceneDescription
} from "../../services/aiVision";

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
    const result = await generateSceneDescriptionAPI(
      imageUrl,
      roomType,
      options || {
        timeout: 30000,
        maxRetries: 2
      }
    );

    return result;
  } catch (error) {
    console.error("[AI Actions] Failed to generate scene description:", error);
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
  const results = await Promise.allSettled(
    images.map(({ imageUrl, roomType }) =>
      generateSceneDescriptionAPI(imageUrl, roomType, {
        timeout: 30000,
        maxRetries: 2
      })
    )
  );

  return results.map((result) => {
    if (result.status === "fulfilled") {
      return result.value;
    } else {
      console.error("[AI Actions] Scene description failed:", result.reason);
      return null;
    }
  });
}
