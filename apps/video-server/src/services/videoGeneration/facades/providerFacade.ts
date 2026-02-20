import logger from "@/config/logger";
import type { VideoGenerationProviderStrategy } from "@/services/videoGeneration/ports";
import type { DBVideoGenJob } from "@shared/types/models";

export type ProviderDispatchInput = {
  jobId: string;
  videoId: string;
  prompt: string;
  imageUrls: string[];
  orientation: "vertical" | "landscape";
  durationSeconds: number;
  webhookUrl: string;
};

export type ProviderDispatchResult = {
  provider: string;
  model: NonNullable<DBVideoGenJob["generationSettings"]>["model"];
  requestId: string;
  waitForOutput?: () => Promise<{ outputUrl: string }>;
};

export class ProviderDispatchFacade {
  constructor(
    private readonly strategies: VideoGenerationProviderStrategy<
      ProviderDispatchInput,
      ProviderDispatchResult
    >[]
  ) {}

  async dispatch(input: ProviderDispatchInput): Promise<ProviderDispatchResult> {
    const eligible = this.strategies.filter((strategy) => strategy.canHandle(input));
    let lastError: Error | null = null;

    for (const strategy of eligible) {
      try {
        return await strategy.dispatch(input);
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));
        logger.warn(
          {
            jobId: input.jobId,
            provider: strategy.name,
            error: lastError.message
          },
          "[VideoGenerationService] Provider strategy dispatch failed"
        );
      }
    }

    throw lastError ?? new Error("No eligible provider strategy");
  }
}
