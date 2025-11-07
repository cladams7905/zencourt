/**
 * Kling API Service
 *
 * Handles all interactions with the Kling AI video generation API via fal.ai
 * Using @fal-ai/client (the new package, not the deprecated serverless-client)
 */
import { fal } from "@fal-ai/client";
import type {
  KlingApiRequest,
  KlingApiResponse,
  RoomVideoRequest,
  VideoGenerationError,
  PromptBuilderContext
} from "@/types/video-generation";

// ============================================================================
// Main API Functions
// ============================================================================

/**
 * Generate video for a single room using fal.subscribe (blocking call with internal polling)
 */
export async function generateRoomVideo(
  roomData: RoomVideoRequest
): Promise<KlingApiResponse> {
  try {
    // Select best images (up to 4 for elements endpoint)
    const selectedImages = selectBestImages(roomData.images, 4);

    if (selectedImages.length === 0) {
      throw createError(
        `No images available for room: ${roomData.roomName}`,
        "VALIDATION_ERROR"
      );
    }

    // Build prompt for this room
    const prompt = buildKlingPrompt({
      roomName: roomData.roomName,
      roomType: roomData.roomType,
      aiDirections: roomData.settings.aiDirections,
      imageCount: selectedImages.length,
      sceneDescriptions: roomData.sceneDescriptions
    });

    // Construct Kling API request for v1.6/standard/elements
    const input: KlingApiRequest = {
      prompt,
      input_image_urls: selectedImages,
      duration: roomData.settings.duration,
      aspect_ratio: roomData.settings.aspectRatio
      // No negative_prompt for maximum adherence to input images
    };

    console.log(
      `[Kling API] Starting video generation for room: ${roomData.roomName} with ${selectedImages.length} images`
    );
    console.log(`[Kling API] Request payload:`, {
      prompt: prompt.substring(0, 100) + "...",
      imageCount: selectedImages.length,
      duration: input.duration,
      aspectRatio: input.aspect_ratio
    });

    // Use fal.subscribe which handles queue submission and polling internally
    const result = await fal.subscribe(
      "fal-ai/kling-video/v1.6/standard/elements",
      {
        input: input,
        pollInterval: 5000,
        logs: true,
        onQueueUpdate: (update) => {
          if (update.status === "IN_PROGRESS") {
            update.logs
              .map((log) => log.message)
              .forEach((msg) => {
                console.log(`[Kling API] ${msg}`);
              });
          }
          console.log(`[Kling API] Queue status: ${update.status}`);
        }
      }
    );

    console.log(`[Kling API] ✓ Video generation completed`);
    console.log(`[Kling API] Request ID:`, result.requestId);
    console.log(`[Kling API] Result:`, JSON.stringify(result.data, null, 2));

    // Validate response structure
    const responseData = result.data as KlingApiResponse;

    if (!responseData.video) {
      throw createError(
        "Invalid response from Kling API: missing video property",
        "KLING_API_ERROR",
        result
      );
    }

    if (!responseData.video.url) {
      throw createError(
        "Invalid response from Kling API: missing video URL",
        "KLING_API_ERROR",
        result
      );
    }

    return responseData;
  } catch (error) {
    console.error(
      `[Kling API] Error generating video for room ${roomData.roomName}:`,
      error
    );
    throw error;
  }
}

// ============================================================================
// Image Selection Functions
// ============================================================================

/**
 * Select the best images for video generation (up to maxCount)
 * Prioritizes images with higher confidence scores
 */
function selectBestImages(imageUrls: string[], maxCount: number = 4): string[] {
  if (imageUrls.length === 0) {
    return [];
  }

  // If we have fewer images than maxCount, return all
  if (imageUrls.length <= maxCount) {
    return imageUrls;
  }

  // Otherwise, take the first maxCount images
  // (assumes images are already ordered by confidence or user preference)
  return imageUrls.slice(0, maxCount);
}

// ============================================================================
// Prompt Building Functions
// ============================================================================

/**
 * Build a detailed prompt incorporating scene descriptions from OpenAI vision
 */
function buildKlingPrompt(context: PromptBuilderContext): string {
  const { roomType, aiDirections, sceneDescriptions } = context;

  // Start with base camera movement instruction
  let prompt = `Smooth camera pan through ${roomType.toLowerCase()}. Camera should move very slowly through the space.`;

  // Add detailed scene descriptions if available
  if (sceneDescriptions && sceneDescriptions.length > 0) {
    // Combine scene descriptions into a comprehensive description
    const detailedDescription = sceneDescriptions
      .filter((desc) => desc && desc.trim().length > 0)
      .join(" ");

    if (detailedDescription) {
      prompt += ` ${detailedDescription}`;
    }
  } else {
    // Fallback to minimal prompt if no scene descriptions
    prompt += ` Pay special attention to the dimensions and layout of the space and stick exactly to which features are in the input images.`;
  }

  // Add AI directions if provided (user's specific instructions)
  if (aiDirections && aiDirections.trim().length > 0) {
    prompt += ` ${aiDirections.trim()}`;
  }

  // Ensure prompt doesn't exceed max length (2500 chars)
  if (prompt.length > 2500) {
    console.warn(
      `[Kling Prompt] Prompt exceeded 2500 chars (${prompt.length}), truncating...`
    );
    prompt = prompt.substring(0, 2497) + "...";
  }

  console.log(
    `[Kling Prompt] Generated prompt (${prompt.length} chars):`,
    prompt
  );

  return prompt;
}

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Create a VideoGenerationError with proper typing
 */
function createError(
  message: string,
  code: VideoGenerationError["code"],
  details?: unknown
): VideoGenerationError {
  const error = new Error(message) as VideoGenerationError;
  error.code = code;
  error.details = details;
  error.name = "VideoGenerationError";
  return error;
}
