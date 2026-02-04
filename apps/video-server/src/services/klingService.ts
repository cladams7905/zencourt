import { fal } from "@fal-ai/client";
import logger from "@/config/logger";
import type { KlingAspectRatio } from "@shared/types/api";

interface SubmitOptions {
  prompt: string;
  imageUrls: string[];
  duration?: "5" | "10";
  aspectRatio?: KlingAspectRatio;
  webhookUrl?: string;
}

const MODEL_ID = "fal-ai/kling-video/v1.6/standard/elements";

class KlingService {
  constructor() {
    fal.config({
      credentials: () => process.env.FAL_KEY
    });
  }

  async submitRoomVideo(options: SubmitOptions): Promise<string> {
    if (!options.prompt) {
      throw new Error("Prompt is required for Kling job submission");
    }

    if (!options.imageUrls || options.imageUrls.length === 0) {
      throw new Error("At least one image URL is required for Kling job");
    }

    const selectedImages = options.imageUrls.slice(0, 4);

    const webhookUrl = options.webhookUrl ?? process.env.FAL_WEBHOOK_URL;

    try {
      const { request_id } = await fal.queue.submit(MODEL_ID, {
        input: {
          prompt: options.prompt,
          input_image_urls: selectedImages,
          duration: options.duration ?? "5",
          aspect_ratio: options.aspectRatio ?? "16:9"
        },
        webhookUrl
      });

      logger.info(
        {
          requestId: request_id,
          imageCount: selectedImages.length
        },
        "[KlingService] Submitted room video generation job"
      );

      return request_id;
    } catch (error) {
      logger.error(
        {
          webhookUrl,
          error: error instanceof Error ? error.message : String(error)
        },
        "[KlingService] Failed to submit job to fal.ai"
      );
      throw error;
    }
  }
}

export const klingService = new KlingService();
