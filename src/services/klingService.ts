/**
 * Kling API Service
 *
 * Handles all interactions with the Kling AI video generation API via fal.ai
 * Using @fal-ai/client (the new package, not the deprecated serverless-client)
 */
"use server";

import { fal } from "@fal-ai/client";
import type {
  KlingApiRequest,
  KlingApiResponse,
  RoomVideoRequest,
  KlingServiceConfig,
  VideoGenerationError,
  ImageSelectionResult,
  PromptBuilderContext
} from "@/types/video-generation";
import type { ProcessedImage } from "@/types/images";

// ============================================================================
// Configuration
// ============================================================================

const DEFAULT_CONFIG: KlingServiceConfig = {
  apiKey: "", // Will be loaded dynamically
  maxRetries: 3,
  timeoutMs: 60000, // 60 seconds
  concurrentRequests: 3
};

// Configure fal.ai client with credentials resolver function
// This ensures the API key is read at runtime, not at module load time
// This is critical for serverless/edge environments
fal.config({
  credentials: () => {
    const apiKey = process.env.FAL_KEY;
    if (!apiKey) {
      console.error("[Kling Service] FAL_KEY not found in credentials resolver");
    }
    return apiKey;
  }
});

/**
 * Validate that API key is available
 * This is called on each request to ensure configuration is correct
 */
function ensureFalConfigured(): string {
  const apiKey = process.env.FAL_KEY || "";

  if (!apiKey) {
    console.error("[Kling Service] ❌ FAL_KEY environment variable is not set");
    console.error("[Kling Service] Process.env exists:", typeof process !== 'undefined' && typeof process.env !== 'undefined');
    console.error(
      "[Kling Service] Available env vars starting with FAL:",
      Object.keys(process.env || {}).filter((k) => k.startsWith("FAL"))
    );
    console.error(
      "[Kling Service] All env var keys:",
      Object.keys(process.env || {}).slice(0, 10)
    );
    throw new Error("FAL_KEY environment variable is not set. Please configure it in your deployment environment.");
  }

  console.log("[Kling Service] ✓ FAL_KEY is configured");
  return apiKey;
}

// ============================================================================
// Main API Functions
// ============================================================================

/**
 * Submit video generation request for a single room (non-blocking)
 */
export async function submitRoomVideoGeneration(
  roomData: RoomVideoRequest
): Promise<string> {
  try {
    // Ensure fal.ai client is configured with API key
    console.log("[Kling Service] Ensuring FAL client is configured...");
    ensureFalConfigured();

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
    const request: KlingApiRequest = {
      prompt,
      input_image_urls: selectedImages,
      duration: roomData.settings.duration,
      aspect_ratio: roomData.settings.aspectRatio
      // No negative_prompt for maximum adherence to input images
    };

    console.log(
      `[Kling API] Submitting video generation for room: ${roomData.roomName} with ${selectedImages.length} images`
    );
    console.log(`[Kling API] Request payload:`, {
      prompt: prompt.substring(0, 100) + "...",
      imageCount: selectedImages.length,
      duration: request.duration,
      aspectRatio: request.aspect_ratio
    });

    // Submit to queue (non-blocking)
    console.log(`[Kling API] 🔵 About to call fal.queue.submit...`);
    console.log(`[Kling API] Endpoint: fal-ai/kling-video/v1.6/standard/elements`);
    console.log(`[Kling API] Full request:`, JSON.stringify(request, null, 2));

    let result: { request_id: string };
    try {
      console.log(`[Kling API] 🔵 Calling fal.queue.submit NOW...`);

      // Create a timeout promise (30 seconds)
      const timeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(() => {
          console.error(`[Kling API] ⏱️  TIMEOUT: fal.queue.submit took longer than 30 seconds`);
          reject(new Error('fal.queue.submit timed out after 30 seconds'));
        }, 30000);
      });

      // Get webhook URL from environment (Vercel deployment URL)
      const webhookUrl = process.env.NEXT_PUBLIC_APP_URL
        ? `${process.env.NEXT_PUBLIC_APP_URL}/api/webhooks/fal`
        : process.env.VERCEL_URL
        ? `https://${process.env.VERCEL_URL}/api/webhooks/fal`
        : undefined;

      console.log(`[Kling API] Webhook URL:`, webhookUrl || 'Not configured');

      // BYPASS SDK: Use direct HTTP fetch instead of fal.queue.submit
      // The SDK is hanging in production, so we'll call the REST API directly
      console.log(`[Kling API] Using direct HTTP fetch (bypassing SDK)...`);

      const apiKey = process.env.FAL_KEY;
      if (!apiKey) {
        throw new Error("FAL_KEY not available");
      }

      const apiUrl = webhookUrl
        ? `https://queue.fal.run/fal-ai/kling-video/v1.6/standard/elements?fal_webhook=${encodeURIComponent(webhookUrl)}`
        : `https://queue.fal.run/fal-ai/kling-video/v1.6/standard/elements`;

      console.log(`[Kling API] POST to:`, apiUrl);

      const fetchPromise = fetch(apiUrl, {
        method: "POST",
        headers: {
          "Authorization": `Key ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(request),
      }).then(async (response) => {
        console.log(`[Kling API] HTTP Response status:`, response.status);

        if (!response.ok) {
          const errorText = await response.text();
          console.error(`[Kling API] Error response:`, errorText);
          throw new Error(`fal.ai API error: ${response.status} - ${errorText}`);
        }

        const data = await response.json();
        console.log(`[Kling API] Response data:`, JSON.stringify(data, null, 2));
        return data;
      });

      // Race between fetch and timeout
      const submitResult = await Promise.race([fetchPromise, timeoutPromise]);

      result = submitResult as { request_id: string };

      console.log(`[Kling API] ✅ fal.queue.submit returned successfully`);
      console.log(`[Kling API] Result type:`, typeof result);
      console.log(`[Kling API] Result keys:`, Object.keys(result || {}));
      console.log(`[Kling API] Full result:`, JSON.stringify(result, null, 2));
    } catch (submitError) {
      console.error(`[Kling API] ❌ fal.queue.submit threw an error:`, submitError);
      console.error(`[Kling API] Error type:`, submitError instanceof Error ? submitError.constructor.name : typeof submitError);
      console.error(`[Kling API] Error message:`, submitError instanceof Error ? submitError.message : String(submitError));
      console.error(`[Kling API] Error stack:`, submitError instanceof Error ? submitError.stack : 'No stack');

      // Log additional debugging info about fal module
      console.error(`[Kling API] fal module debug:`, {
        hasQueue: !!fal.queue,
        hasSubmit: typeof fal.queue?.submit,
        queueKeys: fal.queue ? Object.keys(fal.queue).slice(0, 5) : []
      });

      throw submitError;
    }

    // Extract request_id from the result
    const requestId = result.request_id;

    if (!requestId) {
      console.error(`[Kling API] ❌ No request_id in response!`);
      console.error(`[Kling API] Full result:`, JSON.stringify(result, null, 2));
      throw new Error("No request_id returned from fal.queue.submit");
    }

    console.log(
      `[Kling API] ✓ Successfully submitted request for room ${roomData.roomName}, requestId: ${requestId}`
    );

    return requestId;
  } catch (error) {
    console.error(
      `[Kling API] Error submitting video generation for room ${roomData.roomName}:`,
      error
    );
    throw error;
  }
}

/**
 * Poll the status of a video generation request
 */
export async function pollRoomVideoStatus(
  requestId: string
): Promise<{ status: string; completed: boolean }> {
  try {
    // Ensure fal.ai client is configured
    ensureFalConfigured();

    const status = await fal.queue.status(
      "fal-ai/kling-video/v1.6/standard/elements",
      { requestId, logs: true }
    );

    return {
      status: status.status,
      completed: status.status === "COMPLETED"
    };
  } catch (error) {
    console.error(
      `[Kling API] Error polling status for request ${requestId}:`,
      error
    );
    throw error;
  }
}

/**
 * Get the result of a completed video generation request
 */
export async function getRoomVideoResult(
  requestId: string
): Promise<KlingApiResponse> {
  try {
    // Ensure fal.ai client is configured
    ensureFalConfigured();

    const result = (await fal.queue.result(
      "fal-ai/kling-video/v1.6/standard/elements",
      { requestId }
    )) as { data?: KlingApiResponse } | KlingApiResponse;

    console.log(
      `[Kling API] Retrieved result for request ${requestId}:`,
      JSON.stringify(result, null, 2)
    );

    // Handle both possible response structures:
    // 2. { video: { url, ... } } (direct)
    let responseData: KlingApiResponse;

    if ("video" in result) {
      // Direct response
      responseData = result as KlingApiResponse;
    } else {
      throw createError(
        "Invalid response from Kling API: missing video data",
        "KLING_API_ERROR",
        result
      );
    }

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
      `[Kling API] Error getting result for request ${requestId}:`,
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

/**
 * Select best images from ProcessedImage array
 */
function selectBestImagesFromProcessed(
  images: ProcessedImage[],
  maxCount: number = 4
): ImageSelectionResult {
  if (images.length === 0) {
    return {
      selectedUrls: [],
      totalImages: 0,
      confidenceScores: []
    };
  }

  // Filter out images without upload URLs
  const uploadedImages = images.filter((img) => img.uploadUrl);

  if (uploadedImages.length === 0) {
    return {
      selectedUrls: [],
      totalImages: images.length,
      confidenceScores: []
    };
  }

  // Sort by confidence score (descending)
  const sortedImages = [...uploadedImages].sort((a, b) => {
    const confidenceA = a.classification?.confidence || 0;
    const confidenceB = b.classification?.confidence || 0;
    return confidenceB - confidenceA;
  });

  // Take top maxCount images
  const selectedImages = sortedImages.slice(0, maxCount);

  return {
    selectedUrls: selectedImages.map((img) => img.uploadUrl!),
    totalImages: images.length,
    confidenceScores: selectedImages.map(
      (img) => img.classification?.confidence || 0
    )
  };
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
 * Execute a function with retry logic
 */
async function executeWithRetry<T>(
  operation: () => Promise<T>,
  options: {
    maxRetries: number;
    backoff: "exponential" | "linear";
    onRetry?: (attempt: number, error: Error) => void;
  }
): Promise<T> {
  let lastError: Error;

  for (let attempt = 0; attempt <= options.maxRetries; attempt++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error as Error;

      // Don't retry on certain error types
      if (
        lastError.message.includes("VALIDATION_ERROR") ||
        lastError.message.includes("Invalid")
      ) {
        throw lastError;
      }

      if (attempt < options.maxRetries) {
        const delay =
          options.backoff === "exponential"
            ? Math.min(1000 * Math.pow(2, attempt), 30000)
            : 1000 * (attempt + 1);

        // For rate limiting, wait longer
        const finalDelay = lastError.message.includes("KLING_RATE_LIMIT")
          ? Math.max(delay, 10000)
          : delay;

        options.onRetry?.(attempt + 1, lastError);
        await new Promise((resolve) => setTimeout(resolve, finalDelay));
      }
    }
  }

  throw lastError!;
}

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

// ============================================================================
// Export Configuration
// ============================================================================

const klingConfig = DEFAULT_CONFIG;
