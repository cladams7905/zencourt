import { fal } from "@fal-ai/client";
import logger from "@/config/logger";
import { env } from "@/config/env";
import type { KlingAspectRatio } from "@shared/types/api";
import { randomUUID } from "crypto";

interface SubmitOptions {
  prompt: string;
  imageUrls: string[];
  duration?: "5" | "10";
  aspectRatio?: KlingAspectRatio;
  webhookUrl?: string;
}

// const MODEL_ID = "fal-ai/kling-video/v1.6/standard/elements";

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

    // const selectedImages = options.imageUrls.slice(0, 4);

    const webhookUrl = options.webhookUrl ?? env.falWebhookUrl;

    // const { request_id } = await fal.queue.submit(MODEL_ID, {
    //   input: {
    //     prompt: options.prompt,
    //     input_image_urls: selectedImages,
    //     duration: options.duration ?? "5",
    //     aspect_ratio: options.aspectRatio ?? "16:9"
    //   },
    //   webhookUrl
    // });

    // Temporarily bypass fal.ai response and trigger webhook directly for testing
    const requestId = randomUUID();

    const mockFalPayload = {
      request_id: requestId,
      status: "OK" as const,
      payload: {
        video: {
          url: "https://v3b.fal.media/files/b/penguin/-wLRjCckKp-sDAG0pjhg5_output.mp4",
          content_type: "video/mp4",
          file_size: 13393068,
          file_name: "output.mp4"
        }
      }
    };

    try {
      await fetch(webhookUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify(mockFalPayload)
      });

      // logger.info(
      //   {
      //     requestId: request_id,
      //     imageCount: selectedImages.length
      //   },
      //   "[KlingService] Submitted room video generation job"
      // );

      logger.info(
        {
          requestId,
          webhookUrl
        },
        "[KlingService] Sent mock fal webhook payload for testing"
      );
    } catch (error) {
      logger.error(
        {
          requestId,
          webhookUrl,
          error: error instanceof Error ? error.message : String(error)
        },
        "[KlingService] Failed to send mock fal webhook payload"
      );
    }

    return requestId;
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
