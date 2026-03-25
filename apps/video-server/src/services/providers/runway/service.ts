import RunwayML from "@runwayml/sdk";
import type { TaskRetrieveResponse } from "@runwayml/sdk/resources/tasks";
import logger from "@/config/logger";
import { toRunwayApiModel } from "@/services/videoGeneration/domain/runwayModels";
import type { RunwaySubmitInput } from "./types";

const DEFAULT_API_BASE = "https://api.dev.runwayml.com";
const DEFAULT_API_VERSION = "2024-11-06";

class RunwayService {
  private client: RunwayML | null = null;

  private getApiBase(): string {
    return (process.env.RUNWAY_API_URL || DEFAULT_API_BASE).replace(/\/+$/, "");
  }

  private getApiVersion(): string {
    return process.env.RUNWAY_API_VERSION || DEFAULT_API_VERSION;
  }

  private getApiKey(): string {
    const apiKey = process.env.RUNWAY_API_KEY;
    if (!apiKey) {
      throw new Error("RUNWAY_API_KEY is not configured");
    }
    return apiKey;
  }

  private getClient(): RunwayML {
    if (this.client) {
      return this.client;
    }

    this.client = new RunwayML({
      apiKey: this.getApiKey(),
      baseURL: this.getApiBase(),
      defaultHeaders: {
        "X-Runway-Version": this.getApiVersion()
      }
    });

    return this.client;
  }

  async submitImageToVideo(options: RunwaySubmitInput): Promise<{
    id: string;
    waitForTaskOutput: () => Promise<{ output?: Array<{ uri?: string }> }>;
  }> {
    const { model, promptImage, promptText, ratio, duration, audio = false } = options;
    const client = this.getClient();
    const boundedPrompt = promptText.slice(0, 1000);

    try {
      const request = {
        model: toRunwayApiModel(model),
        promptText: boundedPrompt,
        promptImage: [{ uri: promptImage, position: "first" }],
        ratio,
        duration,
        audio
      };
      // The installed SDK types lag the live API and do not yet include gen4.5.
      const taskPromise = client.imageToVideo.create(request as never);

      const task = await taskPromise;
      if (!task?.id) {
        throw new Error("Runway response missing task id");
      }

      return {
        id: task.id,
        waitForTaskOutput: async () => {
          const result = await taskPromise.waitForTaskOutput();
          return {
            output: result.output?.map((url) => ({ uri: url }))
          };
        }
      };
    } catch (error) {
      logger.error(
        { error: error instanceof Error ? error.message : String(error) },
        "[RunwayService] Failed to submit image-to-video request"
      );
      throw error;
    }
  }

  async retrieveTask(taskId: string): Promise<TaskRetrieveResponse> {
    const client = this.getClient();
    return client.tasks.retrieve(taskId);
  }

  async cancelTask(taskId: string): Promise<void> {
    const client = this.getClient();
    await client.tasks.delete(taskId);
  }
}

export const runwayService = new RunwayService();
