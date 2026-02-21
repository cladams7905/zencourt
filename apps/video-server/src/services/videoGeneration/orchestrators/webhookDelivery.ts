import logger from "@/config/logger";
import type { VideoJobResult, VideoJobWebhookPayload } from "@shared/types/api";
import type { DBVideoGenJob } from "@db/types/models";

type VideoContext = {
  listingId: string;
  callbackUrl: string;
};

type WebhookDeliveryDeps = {
  getVideoContext: (videoId: string) => Promise<VideoContext>;
  sendWebhook: (options: {
    url: string;
    secret: string;
    payload: VideoJobWebhookPayload;
    maxRetries?: number;
    backoffMs?: number;
  }) => Promise<void>;
};

export async function sendJobCompletionWebhookOrchestrator(
  job: DBVideoGenJob,
  result: VideoJobResult,
  deps: WebhookDeliveryDeps
): Promise<void> {
  const videoContext = await deps.getVideoContext(job.videoGenBatchId);
  const webhookUrl = videoContext.callbackUrl;
  const webhookSecret = process.env.VERCEL_WEBHOOK_SECRET;

  if (!webhookUrl || !webhookSecret) {
    if (!webhookSecret) {
      logger.warn(
        { jobId: job.id },
        "[VideoGenerationService] VERCEL_WEBHOOK_SECRET not configured, skipping webhook delivery"
      );
    } else if (!webhookUrl) {
      logger.warn(
        { jobId: job.id, videoId: job.videoGenBatchId },
        "[VideoGenerationService] callbackUrl empty (cache cold or server restart), skipping webhook delivery"
      );
    }
    return;
  }

  const payload: VideoJobWebhookPayload = {
    jobId: job.id,
    listingId: videoContext.listingId,
    status: "completed",
    timestamp: new Date().toISOString(),
    result
  };

  try {
    await deps.sendWebhook({
      url: webhookUrl,
      secret: webhookSecret,
      payload,
      maxRetries: 5,
      backoffMs: 1000
    });
  } catch (error) {
    logger.error(
      {
        jobId: job.id,
        listingId: videoContext.listingId,
        error: error instanceof Error ? error.message : String(error)
      },
      "[VideoGenerationService] Webhook delivery failed"
    );
  }
}

export async function sendJobFailureWebhookOrchestrator(
  job: DBVideoGenJob,
  errorMessage: string,
  errorType: string,
  errorRetryable: boolean,
  deps: WebhookDeliveryDeps
): Promise<void> {
  const videoContext = await deps.getVideoContext(job.videoGenBatchId);
  const webhookUrl = videoContext.callbackUrl;
  const webhookSecret = process.env.VERCEL_WEBHOOK_SECRET;

  if (!webhookUrl || !webhookSecret) {
    if (!webhookSecret) {
      logger.warn(
        { jobId: job.id },
        "[VideoGenerationService] VERCEL_WEBHOOK_SECRET not configured, skipping failure webhook delivery"
      );
    } else if (!webhookUrl) {
      logger.warn(
        { jobId: job.id, videoId: job.videoGenBatchId },
        "[VideoGenerationService] callbackUrl empty (cache cold or server restart), skipping failure webhook delivery"
      );
    }
    return;
  }

  const payload: VideoJobWebhookPayload = {
    jobId: job.id,
    listingId: videoContext.listingId,
    status: "failed",
    timestamp: new Date().toISOString(),
    error: {
      message: errorMessage,
      code: "",
      type: errorType,
      retryable: errorRetryable
    }
  };

  try {
    await deps.sendWebhook({
      url: webhookUrl,
      secret: webhookSecret,
      payload,
      maxRetries: 3,
      backoffMs: 1000
    });
  } catch (error) {
    logger.error(
      {
        jobId: job.id,
        error: error instanceof Error ? error.message : String(error)
      },
      "[VideoGenerationService] Failed to deliver failure webhook"
    );
  }
}
