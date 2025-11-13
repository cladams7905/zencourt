import { fal } from "@fal-ai/client";
import logger from "@/config/logger";
import { env } from "@/config/env";
import type { KlingAspectRatio, KlingDuration } from "@/types/requests";

interface SubmitOptions {
  prompt: string;
  imageUrls: string[];
  duration?: KlingDuration;
  aspectRatio?: KlingAspectRatio;
}

const MODEL_ID = "fal-ai/kling-video/v1.6/standard/elements";

class KlingService {
  constructor() {
    fal.config({
      credentials: () => env.falApiKey
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

    const { request_id } = await fal.queue.submit(MODEL_ID, {
      input: {
        prompt: options.prompt,
        input_image_urls: selectedImages,
        duration: options.duration ?? "5",
        aspect_ratio: options.aspectRatio ?? "16:9"
      },
      webhookUrl: env.falWebhookUrl
    });

    logger.info(
      {
        requestId: request_id,
        imageCount: selectedImages.length
      },
      "[KlingService] Submitted room video generation job"
    );

    return request_id;
  }

  async downloadVideoFile(videoUrl: string): Promise<Buffer> {
    const response = await fetch(videoUrl);

    if (!response.ok) {
      throw new Error(
        `Failed to download video from fal.ai (${response.status})`
      );
    }

    const arrayBuffer = await response.arrayBuffer();
    return Buffer.from(arrayBuffer);
  }
}

export const klingService = new KlingService();
