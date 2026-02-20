import logger from "@/config/logger";
import type { DBVideoGenJob } from "@shared/types/models";
import type {
  ProviderDispatchFacade,
  ProviderDispatchInput,
  ProviderDispatchResult
} from "@/services/videoGeneration/facades/providerFacade";

type DispatchJobDeps = {
  primaryProviderFacade: ProviderDispatchFacade;
  fallbackProviderFacade: ProviderDispatchFacade;
  markJobProcessing: (
    jobId: string,
    requestId: string,
    generationSettings: DBVideoGenJob["generationSettings"]
  ) => Promise<void>;
  onProviderOutputReady: (
    job: DBVideoGenJob,
    outputUrl: string,
    metadata: { durationSeconds?: number; thumbnailUrl?: string | null }
  ) => Promise<void>;
  onProviderOutputFailure: (jobId: string, errorMessage: string) => Promise<void>;
  buildWebhookUrl: (jobId: string) => string;
  getJobDurationSeconds: (job: DBVideoGenJob) => number;
};

function parseJobInput(job: DBVideoGenJob): ProviderDispatchInput {
  const settings = job.generationSettings;
  if (!settings) {
    throw new Error(`Job ${job.id} missing generationSettings`);
  }
  const { imageUrls, prompt } = settings;
  if (!imageUrls || imageUrls.length === 0) {
    throw new Error(`Job ${job.id} missing imageUrls in generationSettings`);
  }
  if (!prompt) {
    throw new Error(`Job ${job.id} missing prompt in generationSettings`);
  }

  return {
    jobId: job.id,
    videoId: job.videoGenBatchId,
    prompt,
    imageUrls,
    orientation: settings.orientation ?? "vertical",
    durationSeconds: job.metadata?.duration ?? 4,
    webhookUrl: ""
  };
}

function attachAsyncOutputHandlers(
  result: ProviderDispatchResult,
  job: DBVideoGenJob,
  deps: DispatchJobDeps
): void {
  result
    .waitForOutput?.()
    .then((providerOutput) =>
      deps.onProviderOutputReady(job, providerOutput.outputUrl, {
        durationSeconds: 4,
        thumbnailUrl: null
      })
    )
    .catch((error) => {
      const message =
        error instanceof Error ? error.message : "Provider task failed";
      deps.onProviderOutputFailure(job.id, message).catch((innerError) => {
        logger.error(
          {
            jobId: job.id,
            requestId: result.requestId,
            error:
              innerError instanceof Error
                ? innerError.message
                : String(innerError)
          },
          "[VideoGenerationService] Provider output failure handler failed"
        );
      });
    });
}

async function dispatchWithFacade(
  facade: ProviderDispatchFacade,
  input: ProviderDispatchInput
): Promise<ProviderDispatchResult> {
  return facade.dispatch(input);
}

export async function dispatchJobOrchestrator(
  job: DBVideoGenJob,
  deps: DispatchJobDeps
): Promise<void> {
  const parsedInput = parseJobInput(job);
  const input: ProviderDispatchInput = {
    ...parsedInput,
    webhookUrl: deps.buildWebhookUrl(job.id),
    durationSeconds: deps.getJobDurationSeconds(job)
  };

  let result: ProviderDispatchResult;
  try {
    result = await dispatchWithFacade(deps.primaryProviderFacade, input);
  } catch (error) {
    logger.warn(
      {
        jobId: job.id,
        error: error instanceof Error ? error.message : String(error)
      },
      "[VideoGenerationService] Primary provider dispatch failed, trying fallback"
    );
    result = await dispatchWithFacade(deps.fallbackProviderFacade, input);
  }

  await deps.markJobProcessing(job.id, result.requestId, {
    ...job.generationSettings,
    prompt: input.prompt,
    imageUrls: input.imageUrls,
    orientation: input.orientation,
    aiDirections: job.generationSettings?.aiDirections ?? "",
    category: job.generationSettings?.category ?? "general",
    sortOrder: job.generationSettings?.sortOrder ?? 0,
    model: result.model
  });

  logger.info(
    {
      jobId: job.id,
      requestId: result.requestId,
      provider: result.provider
    },
    "[VideoGenerationService] Provider job submitted"
  );

  attachAsyncOutputHandlers(result, job, deps);
}
