import RunwayML from "@runwayml/sdk";
import logger from "@/config/logger";

type Gen4TurboRatio =
  | "1280:720"
  | "720:1280"
  | "1104:832"
  | "832:1104"
  | "960:960"
  | "1584:672";

type SubmitRunwayJobOptions = {
  promptImage: string;
  promptText: string;
  ratio: Gen4TurboRatio;
  duration?: number;
  seed?: number;
};

const DEFAULT_API_BASE = "https://api.dev.runwayml.com";
const DEFAULT_API_VERSION = "2024-11-06";
const MODEL_ID = "gen4_turbo" as const;

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
    const { promptImage, promptText, ratio, duration, seed } = options;
    const client = this.getClient();

    try {
      const taskPromise = client.imageToVideo.create({
        model: MODEL_ID,
        promptText,
        promptImage: [{ uri: promptImage, position: "first" }],
        ratio,
        duration,
        seed
      });

      // Get the task ID immediately
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
