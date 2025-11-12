/**
 * Kling API Service
 *
 * Handles all interactions with the Kling AI video generation API via fal.ai.
 */

import { fal } from "@fal-ai/client";
import type { KlingApiRequest, KlingApiResponse } from "@shared/types/api";
import { VideoGenerationError } from "@shared/types/errors";
import { createChildLogger, logger as baseLogger } from "../../lib/logger";

interface RoomVideoRequest {
  roomId: string;
  roomName: string;
  roomType: string;
  images: string[];
  sceneDescriptions?: string[];
  settings: {
    duration: "5" | "10";
    aspectRatio: "16:9" | "9:16" | "1:1";
    aiDirections: string;
  };
}

interface PromptBuilderContext {
  roomName: string;
  roomType: string;
  aiDirections: string;
  imageCount: number;
  sceneDescriptions?: string[];
}

const klingLogger = createChildLogger(baseLogger, { module: "kling-service" });

fal.config({
  credentials: () => {
    const apiKey = process.env.FAL_KEY;
    if (!apiKey) {
      klingLogger.error("FAL_KEY not found in credentials resolver");
    }
    return apiKey;
  }
});

export class KlingService {
  private readonly logger = klingLogger;

  public async submitRoomVideoRequest(
    roomData: RoomVideoRequest
  ): Promise<string> {
    this.logger.info(
      { roomId: roomData.roomId, roomName: roomData.roomName },
      "Submitting Kling video request"
    );

    try {
      this.ensureFalConfigured();

      const selectedImages = this.selectBestImages(roomData.images, 4);
      if (selectedImages.length === 0) {
        throw this.createError(
          `No images available for room: ${roomData.roomName}`,
          "VALIDATION_ERROR"
        );
      }

      const prompt = this.buildKlingPrompt({
        roomName: roomData.roomName,
        roomType: roomData.roomType,
        aiDirections: roomData.settings.aiDirections,
        imageCount: selectedImages.length,
        sceneDescriptions: roomData.sceneDescriptions
      });

      const input: KlingApiRequest = {
        prompt,
        input_image_urls: selectedImages,
        duration: roomData.settings.duration,
        aspect_ratio: roomData.settings.aspectRatio
      };

      const webhookUrl = this.resolveWebhookUrl();
      if (!webhookUrl) {
        this.logger.warn(
          "No webhook URL configured (NEXT_PUBLIC_APP_URL or VERCEL_URL missing)"
        );
      } else {
        this.logger.info({ webhookUrl }, "Using webhook URL for Kling request");
      }

      const { request_id } = await fal.queue.submit(
        "fal-ai/kling-video/v1.6/standard/elements",
        {
          input,
          webhookUrl
        }
      );

      this.logger.info(
        { requestId: request_id, roomName: roomData.roomName },
        "Kling video request submitted"
      );

      return request_id;
    } catch (error) {
      this.logger.error(
        {
          roomName: roomData.roomName,
          error:
            error instanceof Error
              ? { name: error.name, message: error.message }
              : error
        },
        "Error submitting Kling video request"
      );
      throw error;
    }
  }

  public async generateRoomVideo(
    roomData: RoomVideoRequest
  ): Promise<KlingApiResponse> {
    this.logger.info(
      { roomId: roomData.roomId, roomName: roomData.roomName },
      "Starting Kling video generation"
    );

    try {
      this.ensureFalConfigured();

      const selectedImages = this.selectBestImages(roomData.images, 4);
      if (selectedImages.length === 0) {
        throw this.createError(
          `No images available for room: ${roomData.roomName}`,
          "VALIDATION_ERROR"
        );
      }

      const prompt = this.buildKlingPrompt({
        roomName: roomData.roomName,
        roomType: roomData.roomType,
        aiDirections: roomData.settings.aiDirections,
        imageCount: selectedImages.length,
        sceneDescriptions: roomData.sceneDescriptions
      });

      const input: KlingApiRequest = {
        prompt,
        input_image_urls: selectedImages,
        duration: roomData.settings.duration,
        aspect_ratio: roomData.settings.aspectRatio
      };

      const result = await fal.subscribe(
        "fal-ai/kling-video/v1.6/standard/elements",
        {
          input,
          pollInterval: 5000,
          logs: true,
          onQueueUpdate: (update) =>
            this.logQueueUpdate({
              ...update,
              logs: [{ message: `queue status: ${update.status}` }]
            })
        }
      );

      this.logger.info(
        { requestId: result.requestId },
        "Kling video generation completed"
      );

      const responseData = result.data as KlingApiResponse;

      if (!responseData.video?.url) {
        throw this.createError(
          "Invalid response from Kling API: missing video URL",
          "KLING_API_ERROR",
          result
        );
      }

      return responseData;
    } catch (error) {
      this.logger.error(
        {
          roomName: roomData.roomName,
          error:
            error instanceof Error
              ? { name: error.name, message: error.message }
              : error
        },
        "Error generating Kling video"
      );
      throw error;
    }
  }

  private resolveWebhookUrl(): string | undefined {
    if (process.env.NEXT_PUBLIC_APP_URL) {
      return `${process.env.NEXT_PUBLIC_APP_URL}/api/v1/webhooks/fal`;
    }

    if (process.env.VERCEL_URL) {
      return `https://${process.env.VERCEL_URL}/api/v1/webhooks/fal`;
    }

    return undefined;
  }

  private ensureFalConfigured(): string {
    const apiKey = process.env.FAL_KEY ?? "";

    if (!apiKey) {
      this.logger.error("FAL_KEY environment variable is not set");
      throw new Error(
        "FAL_KEY environment variable is not set. Please configure it in your deployment environment."
      );
    }

    this.logger.debug("FAL_KEY is configured");
    return apiKey;
  }

  private selectBestImages(imageUrls: string[], maxCount: number): string[] {
    if (imageUrls.length === 0) {
      return [];
    }

    if (imageUrls.length <= maxCount) {
      return imageUrls;
    }

    return imageUrls.slice(0, maxCount);
  }

  private buildKlingPrompt(context: PromptBuilderContext): string {
    const { roomType, aiDirections, sceneDescriptions } = context;

    let prompt = `Smooth camera pan through ${roomType.toLowerCase()}. Camera should move very slowly through the space.`;

    if (sceneDescriptions?.length) {
      const detailedDescription = sceneDescriptions
        .filter((desc) => desc?.trim().length)
        .join(" ");

      if (detailedDescription) {
        prompt += ` ${detailedDescription}`;
      }
    } else {
      prompt +=
        " Pay special attention to the dimensions and layout of the space and stick exactly to which features are in the input images.";
    }

    if (aiDirections?.trim().length) {
      prompt += ` ${aiDirections.trim()}`;
    }

    if (prompt.length > 2500) {
      this.logger.warn(
        { length: prompt.length },
        "Kling prompt exceeded 2500 characters, truncating"
      );
      prompt = `${prompt.substring(0, 2497)}...`;
    }

    this.logger.debug(
      {
        promptPreview: `${prompt.substring(0, 100)}...`,
        length: prompt.length
      },
      "Generated Kling prompt"
    );

    return prompt;
  }

  private logQueueUpdate(update: {
    status: string;
    logs: Array<{ message: string }>;
  }) {
    if (update.status === "IN_PROGRESS" && update.logs) {
      update.logs.forEach((logEntry) => {
        this.logger.debug({ message: logEntry.message }, "Kling progress log");
      });
    }

    this.logger.info({ status: update.status }, "Kling queue status update");
  }

  private createError(
    message: string,
    code: VideoGenerationError["code"],
    details?: unknown
  ): VideoGenerationError {
    const error = new VideoGenerationError(message, code, details);
    return error;
  }
}

const klingService = new KlingService();
export default klingService;
