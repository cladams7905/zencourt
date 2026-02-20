import RunwayML from "@runwayml/sdk";
import logger from "@/config/logger";

type RunwayImageToVideoRatio =
  | "1280:720"
  | "720:1280"
  | "1080:1920"
  | "1920:1080";

type SubmitRunwayJobOptions = {
  promptImage: string;
  promptText: string;
  ratio: RunwayImageToVideoRatio;
  duration?: 4 | 6 | 8;
  audio?: boolean;
};

const DEFAULT_API_BASE = "https://api.dev.runwayml.com";
const DEFAULT_API_VERSION = "2024-11-06";
const MODEL_ID = "veo3.1_fast" as const;

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

  async submitImageToVideo(options: SubmitRunwayJobOptions): Promise<{
    id: string;
    waitForTaskOutput: () => Promise<{ output?: Array<{ uri?: string }> }>;
  }> {
    const { promptImage, promptText, ratio, duration, audio = false } = options;
    const client = this.getClient();
    const boundedPrompt = promptText.slice(0, 1000);

    try {
      const taskPromise = client.imageToVideo.create({
        model: MODEL_ID,
        promptText: boundedPrompt,
        promptImage: [{ uri: promptImage, position: "first" }],
        ratio,
        duration,
        audio
      });

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
}

export const runwayService = new RunwayService();
