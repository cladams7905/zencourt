import logger from "@/config/logger";
import type { VideoGenerationProviderStrategy } from "@/services/videoGeneration/ports";
import type { DBVideoGenJob } from "@shared/types/models";
import {
  ProviderErrorCode,
  VideoGenerationServiceError
} from "@/services/videoGeneration/errors";
import {
  logProviderMetricsSnapshot,
  recordProviderAttempt,
  recordProviderFailure,
  recordProviderSuccess
} from "@/services/videoGeneration/metrics";

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
  private consecutiveFailures = new Map<string, number>();
  private circuitOpenUntil = new Map<string, number>();

  constructor(
    private readonly strategies: VideoGenerationProviderStrategy<
      ProviderDispatchInput,
      ProviderDispatchResult
    >[]
  ) {}

  private getRetryAttempts(): number {
    return Number(process.env.PROVIDER_RETRY_ATTEMPTS) || 2;
  }

  private getCircuitFailureThreshold(): number {
    return Number(process.env.PROVIDER_CIRCUIT_FAILURE_THRESHOLD) || 3;
  }

  private getCircuitCooldownMs(): number {
    return Number(process.env.PROVIDER_CIRCUIT_COOLDOWN_MS) || 60_000;
  }

  private isCircuitOpen(provider: string): boolean {
    const openUntil = this.circuitOpenUntil.get(provider);
    return typeof openUntil === "number" && Date.now() < openUntil;
  }

  private markFailure(provider: string): void {
    const next = (this.consecutiveFailures.get(provider) ?? 0) + 1;
    this.consecutiveFailures.set(provider, next);
    if (next >= this.getCircuitFailureThreshold()) {
      this.circuitOpenUntil.set(provider, Date.now() + this.getCircuitCooldownMs());
    }
  }

  private markSuccess(provider: string): void {
    this.consecutiveFailures.set(provider, 0);
    this.circuitOpenUntil.delete(provider);
  }

  async dispatch(input: ProviderDispatchInput): Promise<ProviderDispatchResult> {
    const eligible = this.strategies.filter((strategy) => strategy.canHandle(input));
    let lastError: Error | null = null;

    for (const strategy of eligible) {
      if (this.isCircuitOpen(strategy.name)) {
        lastError = new VideoGenerationServiceError(
          `Provider circuit is open for ${strategy.name}`,
          ProviderErrorCode.PROVIDER_CIRCUIT_OPEN,
          true,
          { provider: strategy.name }
        );
        continue;
      }

      const maxAttempts = this.getRetryAttempts();
      for (let attempt = 1; attempt <= maxAttempts; attempt++) {
        recordProviderAttempt(strategy.name);
        const attemptStart = Date.now();
        try {
          const result = await strategy.dispatch(input);
          this.markSuccess(strategy.name);
          recordProviderSuccess(strategy.name);
          logger.info(
            {
              jobId: input.jobId,
              provider: strategy.name,
              attempt,
              latencyMs: Date.now() - attemptStart
            },
            "[VideoGenerationService] Provider dispatch succeeded"
          );
          logProviderMetricsSnapshot({ jobId: input.jobId, provider: strategy.name });
          return result;
        } catch (error) {
          lastError = error instanceof Error ? error : new Error(String(error));
          this.markFailure(strategy.name);
          recordProviderFailure(strategy.name);
          logger.warn(
            {
              jobId: input.jobId,
              provider: strategy.name,
              attempt,
              maxAttempts,
              latencyMs: Date.now() - attemptStart,
              error: lastError.message
            },
            "[VideoGenerationService] Provider strategy dispatch failed"
          );
        }
      }

      logProviderMetricsSnapshot({ jobId: input.jobId, provider: strategy.name });
    }

    throw (
      lastError ??
      new VideoGenerationServiceError(
        "No eligible provider strategy",
        ProviderErrorCode.PROVIDER_DISPATCH_FAILED,
        false,
        { jobId: input.jobId }
      )
    );
  }
}
