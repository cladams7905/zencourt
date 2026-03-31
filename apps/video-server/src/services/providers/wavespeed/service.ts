import WaveSpeed from "wavespeed";
import logger from "@/config/logger";
import type {
  WaveSpeedSubmitInput,
  WaveSpeedTaskResult
} from "./types";

const VEO_MODEL = "google/veo3.1-fast/image-to-video";
const WAVESPEED_API_BASE_URL = "https://api.wavespeed.ai/api/v3";

type WaveSpeedSdkClient = {
  _submit: (
    model: string,
    input?: Record<string, unknown>,
    enableSyncMode?: boolean
  ) => Promise<[string | null, Record<string, unknown> | null]>;
  _getResult: (taskId: string) => Promise<{ data?: Record<string, unknown> }>;
};

type WaveSpeedSubmitResponse = {
  data?: {
    id?: string | null;
  };
  id?: string | null;
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
    const requestPayload = {
      image: input.image,
      prompt: input.prompt,
      duration: input.duration,
      resolution: input.resolution,
      aspect_ratio: input.aspectRatio,
      generate_audio: false,
      negative_prompt: input.negativePrompt
    };
    const submitUrl = new URL(`${WAVESPEED_API_BASE_URL}/${VEO_MODEL}`);
    submitUrl.searchParams.set("webhook", input.webhookUrl);

    try {
      logger.debug(
        {
          model: VEO_MODEL,
          submitUrl: submitUrl.toString(),
          requestPayload
        },
        "[WaveSpeedService] Submitting image-to-video request"
      );

      const response = await fetch(submitUrl.toString(), {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${this.getApiKey()}`
        },
        body: JSON.stringify(requestPayload)
      });

      if (!response.ok) {
        const responseText = await response.text();
        throw new Error(
          `WaveSpeed submit failed (${response.status}): ${responseText || "Unknown error"}`
        );
      }

      const payload = (await response.json()) as WaveSpeedSubmitResponse;
      const taskId = payload.data?.id ?? payload.id;

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
