import WaveSpeed from "wavespeed";
import logger from "@/config/logger";
import type {
  WaveSpeedSubmitInput,
  WaveSpeedTaskResult
} from "./types";

const VEO_MODEL = "google/veo3.1-fast/image-to-video";

type WaveSpeedSdkClient = {
  _submit: (
    model: string,
    input?: Record<string, unknown>,
    enableSyncMode?: boolean
  ) => Promise<[string | null, Record<string, unknown> | null]>;
  _getResult: (taskId: string) => Promise<{ data?: Record<string, unknown> }>;
};

class WaveSpeedService {
  private client: WaveSpeedSdkClient | null = null;

  private getApiKey(): string {
    const apiKey = process.env.WAVESPEED_API_KEY;
    if (!apiKey) {
      throw new Error("WAVESPEED_API_KEY is not configured");
    }
    return apiKey;
  }

  private getClient(): WaveSpeedSdkClient {
    if (this.client) {
      return this.client;
    }

    this.client = new WaveSpeed(this.getApiKey()) as unknown as WaveSpeedSdkClient;
    return this.client;
  }

  async submitImageToVideo(
    input: WaveSpeedSubmitInput
  ): Promise<{ id: string; status: "pending" }> {
    const client = this.getClient();

    try {
      const [taskId] = await client._submit(
        VEO_MODEL,
        {
          image: input.image,
          prompt: input.prompt,
          duration: input.duration,
          resolution: input.resolution,
          aspect_ratio: input.aspectRatio,
          generate_audio: false,
          negative_prompt: input.negativePrompt,
          webhook_url: input.webhookUrl
        },
        false
      );

      if (!taskId) {
        throw new Error("WaveSpeed response missing task id");
      }

      return {
        id: taskId,
        status: "pending"
      };
    } catch (error) {
      logger.error(
        { error: error instanceof Error ? error.message : String(error) },
        "[WaveSpeedService] Failed to submit image-to-video request"
      );
      throw error;
    }
  }

  async retrieveTask(taskId: string): Promise<WaveSpeedTaskResult> {
    const client = this.getClient();
    const result = await client._getResult(taskId);
    const data = result.data ?? {};

    return {
      id: String(data.id ?? taskId),
      status: (data.status as WaveSpeedTaskResult["status"]) ?? "pending",
      outputs: Array.isArray(data.outputs)
        ? (data.outputs as string[])
        : undefined,
      error: typeof data.error === "string" ? data.error : null
    };
  }
}

export const waveSpeedService = new WaveSpeedService();
